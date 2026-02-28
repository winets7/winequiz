"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HostRoundCharacteristicCards } from "@/components/game/host-round-characteristic-cards";
import {
  getDraft,
  setDraft,
  clearDraft,
  roundToWineParams,
  type RoundDataForDraft,
} from "@/lib/lobby-round-draft";
import type { WineParams } from "@/components/game/wine-form";

interface GameData {
  id: string;
  code: string;
  hostId: string;
}

interface RoundData extends RoundDataForDraft {
  id: string;
  roundNumber: number;
  status?: string;
  photos: { id: string; imageUrl: string }[];
}

export default function LobbyRoundEditPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const gameId = params.gameId as string;
  const roundNumber = Number(params.roundNumber);
  const { data: session, status: sessionStatus } = useSession();

  const [game, setGame] = useState<GameData | null>(null);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [draft, setDraftState] = useState<WineParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id;
  const isHost = game?.hostId === userId;
  const sessionReady = sessionStatus !== "loading";

  // Загрузка игры и раундов только после готовности сессии (избегаем редиректа до проверки хоста)
  useEffect(() => {
    if (!sessionReady) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    async function load() {
      try {
        const gameRes = await fetch(`/api/games/${gameId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (!gameRes.ok) {
          setError("Игра не найдена");
          setLoading(false);
          return;
        }
        const gameJson = await gameRes.json();
        const g = gameJson.game;
        setGame({
          id: g.id,
          code: g.code,
          hostId: g.hostId || g.host?.id,
        });

        // Раунды загружаем ДО setLoading(false), иначе init-эффект черновика
        // сработает с пустым rounds[] и запишет пустые параметры в sessionStorage.
        const roundsRes = await fetch(`/api/rounds?gameId=${gameId}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (roundsRes.ok) {
          const roundsData = await roundsRes.json();
          setRounds(roundsData.rounds || []);
        }

        setLoading(false);
      } catch (e) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setError(e instanceof Error && e.name === "AbortError" ? "Таймаут загрузки" : "Ошибка загрузки");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [gameId, sessionReady]);

  // Инициализация черновика из sessionStorage или из раунда (раундов может ещё не быть — новый раунд)
  // Важно: не записывать пустой черновик в sessionStorage, пока не загрузились rounds — иначе
  // при поздней загрузке раундов getDraft вернёт пустой объект и сохранённый цвет не подставится.
  useEffect(() => {
    if (!gameId || !roundNumber || loading) return;

    const round = rounds.find((r) => r.roundNumber === roundNumber);
    const existing = getDraft(gameId, roundNumber);
    if (existing) {
      // Есть черновик в sessionStorage — используем его (пользователь что-то менял)
      setDraftState(existing);
      return;
    }

    const initial = roundToWineParams(round ?? null);
    // Всегда записываем черновик в sessionStorage (в т.ч. для нового раунда),
    // чтобы страница выбора параметра (select) могла его прочитать при первом клике.
    setDraft(gameId, roundNumber, initial);
    setDraftState(initial);
  }, [gameId, roundNumber, loading, rounds]);

  // При возврате с страницы выбора — перечитать черновик из sessionStorage
  // (pathname — чтобы при навигации edit → select → edit обновить draft, т.к. focus не срабатывает)
  useEffect(() => {
    const sync = () => {
      if (!gameId || !roundNumber) return;
      const d = getDraft(gameId, roundNumber);
      if (d) setDraftState(d);
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [gameId, roundNumber, pathname]);

  const existingRound = rounds.find((r) => r.roundNumber === roundNumber);
  const isRoundLocked =
    existingRound?.status === "ACTIVE" || existingRound?.status === "CLOSED";
  const lockReason =
    existingRound?.status === "ACTIVE"
      ? "Раунд уже начат, редактирование недоступно."
      : existingRound?.status === "CLOSED"
        ? "Раунд завершён, редактирование недоступно."
        : null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRoundLocked) return;
    const files = Array.from(e.target.files || []);
    const total = selectedPhotos.length + files.length;
    if (total > 4) {
      setError("Максимум 4 фотографии");
      return;
    }
    setError(null);
    setSelectedPhotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      setPhotoPreviewUrls((prev) => [...prev, URL.createObjectURL(file)]);
    });
  };

  const removePhoto = (index: number) => {
    if (isRoundLocked) return;
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveRound = async () => {
    // Берём черновик из sessionStorage (актуальные выборы со страниц выбора параметра),
    // иначе из state — иначе при быстром «Сохранить» после выбора параметров могли уйти пустые значения
    const payloadDraft = getDraft(gameId, roundNumber) ?? draft;
    if (!game || !payloadDraft || isRoundLocked) return;
    setSaving(true);
    setError(null);

    try {
      const roundRes = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          roundNumber,
          ...payloadDraft,
          vintageYear: payloadDraft.vintageYear ? parseInt(payloadDraft.vintageYear) : null,
          alcoholContent: payloadDraft.alcoholContent ? parseFloat(payloadDraft.alcoholContent) : null,
        }),
      });

      if (!roundRes.ok) {
        const data = await roundRes.json();
        setError(data.error || "Ошибка сохранения раунда");
        setSaving(false);
        return;
      }

      const { round } = await roundRes.json();

      if (selectedPhotos.length > 0) {
        const formData = new FormData();
        selectedPhotos.forEach((photo) => formData.append("photos", photo));
        await fetch(`/api/rounds/${round.id}/photos`, { method: "POST", body: formData });
      }

      clearDraft(gameId, roundNumber);
      router.push(`/lobby/${gameId}`);
    } catch {
      setError("Ошибка при сохранении раунда");
    } finally {
      setSaving(false);
    }
  };

  const isPageLoading = loading || !sessionReady;
  if (isPageLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍷</div>
          <p className="text-[var(--muted-foreground)]">Загрузка...</p>
        </div>
      </main>
    );
  }

  if (sessionStatus === "unauthenticated") {
    router.replace(`/lobby/${gameId}`);
    return null;
  }

  if (error && !game) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-xl text-[var(--error)]">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl"
          >
            На главную
          </button>
        </div>
      </main>
    );
  }

  if (!game || !isHost) {
    router.replace(`/lobby/${gameId}`);
    return null;
  }

  if (!draft) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Подготовка...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center pb-8">
      <div className="w-full sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/lobby/${gameId}`)}
            className="text-sm text-[var(--primary)] font-medium flex items-center gap-1"
          >
            ← Назад
          </button>
          <h1 className="text-lg font-bold">Раунд {roundNumber}</h1>
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-4 mt-4 space-y-6">
        {error && (
          <div className="bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-4 py-2 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {lockReason && (
          <div className="bg-[var(--muted)] text-[var(--muted-foreground)] px-4 py-3 rounded-xl text-sm text-center border border-[var(--border)]">
            🔒 {lockReason}
          </div>
        )}

        {/* Фото бутылки */}
        <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            📸 Фотографии бутылки (до 4 шт.)
          </label>

          {existingRound && existingRound.photos.length > 0 && photoPreviewUrls.length === 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {existingRound.photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)]"
                >
                  <img
                    src={photo.imageUrl}
                    alt={`Фото ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {photoPreviewUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)]"
                >
                  <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                  {!isRoundLocked && (
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-[var(--error)] text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedPhotos.length < 4 && (
            <button
              type="button"
              disabled={isRoundLocked}
              onClick={() => !isRoundLocked && fileInputRef.current?.click()}
              className={`w-full p-4 border-2 border-dashed border-[var(--border)] rounded-xl transition-colors ${
                isRoundLocked
                  ? "text-[var(--muted-foreground)] opacity-60 cursor-not-allowed"
                  : "text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              📷 Добавить фото
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Карточки характеристик */}
        <div>
          <h2 className="text-lg font-bold mb-3">Параметры вина</h2>
          <HostRoundCharacteristicCards
            gameId={gameId}
            roundNumber={roundNumber}
            values={draft}
            disabled={isRoundLocked}
          />
        </div>

        <button
          onClick={handleSaveRound}
          disabled={saving || isRoundLocked}
          className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Сохранение...
            </span>
          ) : existingRound ? (
            "💾 Сохранить изменения"
          ) : (
            "💾 Сохранить раунд"
          )}
        </button>
      </div>
    </main>
  );
}
