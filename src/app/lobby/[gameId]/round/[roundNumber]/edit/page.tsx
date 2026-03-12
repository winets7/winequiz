"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { HostRoundCharacteristicCards } from "@/components/game/host-round-characteristic-cards";
import {
  getDraft,
  setDraft,
  clearDraft,
  clearAllDraftsForGame,
  roundToWineParams,
  type RoundDataForDraft,
} from "@/lib/lobby-round-draft";
import { logNavigation } from "@/lib/navigation-log";
import type { WineParams } from "@/components/game/wine-form";

interface GameData {
  id: string;
  code: string;
  hostId: string;
  status?: string;
}

interface RoundData extends RoundDataForDraft {
  id: string;
  roundNumber: number;
  status?: string;
  photos: { id: string; imageUrl: string }[];
}

const lobbyPath = (gameId: string) => `/lobby/${gameId}`;

const EDIT_PAGE_URL_KEY = "lobby-edit-page-url";
const EDIT_SHOW_SAVE_DIALOG_KEY = "lobby-edit-show-save-dialog";
const EDIT_CAME_VIA_BACK_KEY = "lobby-edit-came-via-back";
const EDIT_LEFT_VIA_BUTTON_KEY = "lobby-edit-left-via-button";

export default function LobbyRoundEditPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const gameId = params.gameId as string;
  const roundNumber = Number(params.roundNumber);
  const parentPath = lobbyPath(gameId);
  const editUrl = pathname ?? `/lobby/${gameId}/round/${roundNumber}/edit`;

  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const { data: session, status: sessionStatus } = useSession();

  // Флаг «мы на странице редактирования» — лобби при открытии после браузерного Назад вернёт сюда и покажет диалог.
  // Не очищаем ключ при unmount: при Назад мы размонтируемся до перехода, лобби должен увидеть ключ и сделать redirect.
  useEffect(() => {
    if (!gameId || typeof window === "undefined") return;
    window.sessionStorage.setItem(EDIT_PAGE_URL_KEY, editUrl);
  }, [gameId, editUrl]);

  // При открытии edit с флагом «показать диалог» (возврат с лобби после браузерного Назад) — показываем диалог.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = window.sessionStorage.getItem(EDIT_SHOW_SAVE_DIALOG_KEY);
      console.log("[navigation][edit-debug] mount dialog check", {
        flag,
        pathname,
        editUrl,
      });
      if (flag === "1") {
        window.sessionStorage.removeItem(EDIT_SHOW_SAVE_DIALOG_KEY);
        window.sessionStorage.removeItem(EDIT_CAME_VIA_BACK_KEY);
        setShowSaveConfirmDialog(true);
        console.log("[navigation][edit-debug] dialog state set to true from flag");
      }
    } catch (error) {
      console.error("[navigation][edit-debug] mount dialog check error", error);
    }
  }, [pathname, editUrl]);

  // Родитель — страница Лобби. Запись в историю при каждом открытии edit (в т.ч. после возврата с select), чтобы «Назад» вёл в лобби.
  useEffect(() => {
    if (!gameId) return;
    if (typeof window !== "undefined") window.sessionStorage.removeItem("hierarchical-back-from-select");
    const t = setTimeout(() => {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl === parentPath) return;
      window.history.replaceState(null, "", parentPath);
      window.history.pushState(null, "", currentUrl);
      logNavigation({
        type: "history_write",
        parentPath,
        currentUrl,
        historyLength: window.history.length,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [gameId, parentPath]);

  // При браузерной «Назад» или свайпе — возвращаемся на edit и показываем диалог «Сохранить?»
  // Слушатель в фазе захвата (capture), чтобы сработать ДО роутера Next.js: иначе роутер размонтирует страницу и диалог не покажется.
  // После router.replace(editUrl) Next.js может перезаписать адресную строку своим состоянием (lobby), поэтому явно синхронизируем URL в следующем тике.
  useEffect(() => {
    console.log("[navigation][edit-debug] popstate listener registered", {
      parentPath,
      editUrl,
    });
    const handlePopState = (e: PopStateEvent) => {
      const current = window.location.pathname + window.location.search;
      const match = current === parentPath;
      console.log("[navigation][edit-debug] popstate event", {
        current,
        parentPath,
        editUrl,
        match,
      });
      if (!match) return;
      logNavigation({
        type: "back_popstate",
        from: editUrl,
        to: parentPath,
      });
      e.stopImmediatePropagation();
      // Флаг нужен на случай, если Next.js уже размонтировал edit: при remount после router.replace диалог откроется по флагу.
      try {
        window.sessionStorage.setItem(EDIT_SHOW_SAVE_DIALOG_KEY, "1");
        window.sessionStorage.setItem(EDIT_CAME_VIA_BACK_KEY, "1");
      } catch (error) {
        console.error("[navigation][edit-debug] set EDIT_SHOW_SAVE_DIALOG_KEY error", error);
      }
      window.history.replaceState(null, "", editUrl);
      router.replace(editUrl);
      setShowSaveConfirmDialog(true);
      console.log("[navigation][edit-debug] dialog state set to true from popstate");
      // Синхронизация адресной строки после того как Next.js обновит состояние (иначе URL остаётся lobby при контенте edit).
      setTimeout(() => window.history.replaceState(null, "", editUrl), 0);
    };
    window.addEventListener("popstate", handlePopState, true);
    return () => {
      window.removeEventListener("popstate", handlePopState, true);
      console.log("[navigation][edit-debug] popstate listener removed", {
        parentPath,
        editUrl,
      });
      // Next.js переключает маршрут до popstate, edit размонтируется. Если URL уже лобби — ставим флаги только если ушли по браузерному Назад,
      // а не по кнопке (goToLobbyPage выставляет EDIT_LEFT_VIA_BUTTON_KEY, тогда диалог при следующем заходе не показываем).
      try {
        const leftViaButton = window.sessionStorage.getItem(EDIT_LEFT_VIA_BUTTON_KEY) === "1";
        if (leftViaButton) {
          window.sessionStorage.removeItem(EDIT_LEFT_VIA_BUTTON_KEY);
          return;
        }
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        if (currentPath === parentPath) {
          window.sessionStorage.setItem(EDIT_SHOW_SAVE_DIALOG_KEY, "1");
          window.sessionStorage.setItem(EDIT_CAME_VIA_BACK_KEY, "1");
          console.log("[navigation][edit-debug] set dialog flag in cleanup (back to lobby)");
        }
      } catch {
        /* ignore */
      }
    };
  }, [parentPath, editUrl, router]);

  const [game, setGame] = useState<GameData | null>(null);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [draft, setDraftState] = useState<WineParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
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
          status: g.status,
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
  const canDeleteRound =
    isHost &&
    game?.status === "WAITING" &&
    existingRound != null &&
    existingRound.status === "CREATED";

  const handleDeleteRound = async () => {
    if (!existingRound || !canDeleteRound || deleting) return;
    if (!confirm("Удалить этот раунд? Слот раунда будет освобождён.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rounds/${existingRound.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось удалить раунд");
        return;
      }
      clearAllDraftsForGame(gameId);
      goToLobbyPage(`/lobby/${gameId}`);
    } finally {
      setDeleting(false);
    }
  };

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
    setPhotoPreviewUrls((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const removePhoto = (index: number) => {
    if (isRoundLocked) return;
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveRound = async (redirectAfterSave?: string) => {
    const payloadDraft = getDraft(gameId, roundNumber) ?? draft;
    if (!game || !payloadDraft || isRoundLocked) return;
    setSaving(true);
    setError(null);
    const redirectTo = redirectAfterSave ?? `/lobby/${gameId}`;

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          const photosRes = await fetch(`/api/rounds/${round.id}/photos`, {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!photosRes.ok) {
            const data = await photosRes.json().catch(() => ({}));
            setError(data.error || "Ошибка загрузки фотографий");
            setSaving(false);
            return;
          }
        } catch (photoErr) {
          clearTimeout(timeoutId);
          setError(
            photoErr instanceof Error && photoErr.name === "AbortError"
              ? "Таймаут загрузки фото. Раунд сохранён, добавьте фото позже."
              : "Ошибка загрузки фотографий"
          );
          setSaving(false);
          return;
        }
      }

      clearDraft(gameId, roundNumber);
      goToLobbyPage(redirectTo);
    } catch {
      setError("Ошибка при сохранении раунда");
    } finally {
      setSaving(false);
    }
  };

  // replace + refresh: без refresh() App Router может не перерисовать страницу лобби при переходе с вложенного маршрута
  const goToLobbyPage = (path?: string) => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(EDIT_PAGE_URL_KEY);
        window.sessionStorage.removeItem(EDIT_SHOW_SAVE_DIALOG_KEY);
        window.sessionStorage.removeItem(EDIT_CAME_VIA_BACK_KEY);
        window.sessionStorage.setItem(EDIT_LEFT_VIA_BUTTON_KEY, "1");
      }
    } catch {
      /* ignore */
    }
    const target = path ?? parentPath;
    router.replace(target);
    setTimeout(() => router.refresh(), 0);
  };

  const handleBackWithConfirm = () => setShowSaveConfirmDialog(true);

  const handleConfirmSave = async () => {
    setShowSaveConfirmDialog(false);
    await handleSaveRound(parentPath);
  };

  const handleConfirmDontSave = () => {
    setShowSaveConfirmDialog(false);
    goToLobbyPage();
  };

  // Во время сохранения не показывать полный экран «Загрузка» (сессия может перейти в loading при refetch)
  const isPageLoading = (loading || !sessionReady) && !saving;
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
    goToLobbyPage(`/lobby/${gameId}`);
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
    goToLobbyPage(`/lobby/${gameId}`);
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
      {/* Диалог «Сохранить внесённые изменения?» при нажатии Назад */}
      {showSaveConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <p className="text-lg font-medium text-center">Сохранить внесённые изменения?</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={handleConfirmDontSave}
                className="w-full py-3 px-4 border border-[var(--border)] rounded-xl font-medium hover:bg-[var(--muted)]"
              >
                Не сохранять
              </button>
              <button
                type="button"
                onClick={() => setShowSaveConfirmDialog(false)}
                className="w-full py-3 px-4 text-[var(--muted-foreground)] rounded-xl font-medium hover:bg-[var(--muted)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBackWithConfirm}
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
                <button
                  key={photo.id}
                  type="button"
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)] block w-full text-left focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  onClick={() => setLightboxUrl(photo.imageUrl)}
                >
                  <img
                    src={photo.imageUrl}
                    alt={`Фото ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
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
                  <button
                    type="button"
                    className="absolute inset-0 w-full h-full block focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-inset"
                    onClick={() => setLightboxUrl(url)}
                  >
                    <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                  {!isRoundLocked && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 z-10 w-6 h-6 bg-[var(--error)] text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {lightboxUrl && (
            <ImageLightbox
              src={lightboxUrl}
              alt="Фото бутылки"
              onClose={() => setLightboxUrl(null)}
            />
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

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSaveRound()}
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
          {canDeleteRound && (
            <button
              type="button"
              onClick={handleDeleteRound}
              disabled={deleting}
              className="w-full py-3 text-sm font-medium text-[var(--error)] border border-[var(--error)] rounded-2xl hover:bg-[var(--error)] hover:text-white transition-colors disabled:opacity-50"
            >
              {deleting ? "⏳ Удаление..." : "🗑 Удалить раунд"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
