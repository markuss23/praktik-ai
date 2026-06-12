"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LogIn, Pencil, Trash2 } from "lucide-react";
import type { PubResourceRatingCreated } from "@/api";
import {
  apiErrorDetail,
  createResourceRating,
  deleteResourceRating,
  listResourceRatings,
  updateResourceRating,
} from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ConfirmModal, RatingListSkeleton } from "@/components/ui";
import { StarRating, StarRatingInput } from "./StarRating";

interface RatingsSectionProps {
  resourceId: number;
}

function formatRatingDate(date: Date): string {
  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function RatingsSection({ resourceId }: RatingsSectionProps) {
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const { currentUser } = useCurrentUser();

  const [ratings, setRatings] = useState<PubResourceRatingCreated[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Formulář slouží pro nové hodnocení i pro inline editaci vlastního
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    listResourceRatings(resourceId)
      .then((data) => {
        if (!cancelled) setRatings(data);
      })
      .catch(async (err) => {
        const detail = await apiErrorDetail(err, "Hodnocení se nepodařilo načíst.");
        if (!cancelled) setLoadError(detail);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, isAuthenticated, authLoading]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const myRating = useMemo(() => {
    if (!currentUser) return null;
    return ratings.find((r) => r.userId === currentUser.userId) ?? null;
  }, [ratings, currentUser]);

  // Ostatní hodnocení — vlastní se vykresluje zvlášť, připnuté nahoře
  const otherRatings = useMemo(
    () => ratings.filter((r) => r.ratingId !== myRating?.ratingId),
    [ratings, myRating],
  );

  const count = ratings.length;
  const average = useMemo(() => {
    if (count === 0) return null;
    return ratings.reduce((sum, r) => sum + r.score, 0) / count;
  }, [ratings, count]);

  const averageLabel =
    average !== null ? `${average.toFixed(1).replace(".", ",")}/5` : "–";

  const flashSaved = () => {
    setJustSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 2500);
  };

  const startEdit = () => {
    if (!myRating) return;
    setScore(myRating.score);
    setComment(myRating.comment ?? "");
    setFormError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (score < 1) {
      setFormError("Vyber počet hvězdiček (1–5).");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const trimmed = comment.trim();
    try {
      if (myRating) {
        const updated = await updateResourceRating(
          myRating.ratingId,
          score,
          trimmed || null,
        );
        setRatings((prev) =>
          prev.map((r) =>
            r.ratingId === updated.ratingId
              ? { ...updated, userDisplayName: updated.userDisplayName ?? r.userDisplayName }
              : r,
          ),
        );
        setEditing(false);
      } else {
        const created = await createResourceRating(resourceId, score, trimmed || null);
        setRatings((prev) => [
          {
            ...created,
            userDisplayName: created.userDisplayName ?? currentUser?.displayName ?? null,
          },
          ...prev,
        ]);
      }
      flashSaved();
    } catch (err) {
      setFormError(await apiErrorDetail(err, "Hodnocení se nepodařilo uložit."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!myRating || deleting) return;
    setDeleting(true);
    setFormError(null);
    try {
      await deleteResourceRating(myRating.ratingId);
      setRatings((prev) => prev.filter((r) => r.ratingId !== myRating.ratingId));
      setEditing(false);
      setScore(0);
      setComment("");
      setDeleteModalOpen(false);
    } catch (err) {
      setFormError(await apiErrorDetail(err, "Hodnocení se nepodařilo smazat."));
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const ratingForm = (
    <div
      className={`bg-white border rounded-lg p-4 view-fade-in ${
        editing ? "border-purple-200" : "border-gray-200"
      }`}
    >
      {editing && (
        <p className="text-xs font-medium text-purple-700 mb-2">
          Úprava tvého hodnocení
        </p>
      )}
      <div className="mb-3">
        <StarRatingInput
          value={score}
          onChange={(v) => {
            setScore(v);
            setFormError(null);
          }}
          disabled={submitting}
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Popis (nepovinný)"
        rows={3}
        maxLength={2000}
        disabled={submitting}
        className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
      />

      {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}

      <div className="flex items-center justify-end gap-2 mt-3">
        {editing && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={submitting}
            className="px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Zrušit
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? "Odesílám…" : editing ? "Uložit změny" : "Odeslat komentář"}
        </button>
      </div>
    </div>
  );

  // Vlastní hodnocení — připnutá zvýrazněná karta s akcemi (upravit / smazat)
  const myRatingCard = myRating && (
    <div className="bg-purple-50/40 border border-purple-200 rounded-lg p-4 view-fade-in hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900 truncate">
              {myRating.userDisplayName ?? "Uživatel"}
            </p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
              Tvoje hodnocení
            </span>
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 save-status-pop">
                <Check size={13} strokeWidth={2} />
                Uloženo
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {formatRatingDate(myRating.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StarRating rating={myRating.score} size={14} />
          <button
            type="button"
            onClick={startEdit}
            disabled={deleting}
            aria-label="Upravit hodnocení"
            title="Upravit hodnocení"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <Pencil size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            disabled={deleting}
            aria-label="Smazat hodnocení"
            title="Smazat hodnocení"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {myRating.comment && (
        <p className="text-sm text-gray-700 mt-2 whitespace-pre-line break-words">
          {myRating.comment}
        </p>
      )}
      {formError && !editing && (
        <p className="mt-2 text-xs text-red-600">{formError}</p>
      )}
    </div>
  );

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-black mb-3">
        Hodnocení{" "}
        <span className="text-gray-400 font-semibold">({loading ? "…" : count})</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
        {/* Průměrné hodnocení */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col items-center justify-center gap-2 text-center">
          <span
            key={averageLabel}
            className="text-3xl font-bold text-black save-status-pop"
          >
            {averageLabel}
          </span>
          <StarRating rating={average ?? 0} size={18} />
        </div>

        <div className="space-y-3">
          {/* Nepřihlášený: výzva k přihlášení */}
          {!authLoading && !isAuthenticated && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Hodnotit a komentovat mohou jen přihlášení uživatelé.
              </p>
              <button
                type="button"
                onClick={login}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors self-start sm:self-auto"
              >
                <LogIn size={15} strokeWidth={1.75} />
                Přihlásit se
              </button>
            </div>
          )}

          {/* Přihlášený bez hodnocení: formulář. S hodnocením: připnutá karta,
              která se při editaci na místě promění ve formulář. */}
          {!authLoading && isAuthenticated && !loading && (
            <>
              {!myRating && ratingForm}
              {myRating && (editing ? ratingForm : myRatingCard)}
            </>
          )}

          {/* Seznam ostatních hodnocení */}
          {loading ? (
            <RatingListSkeleton />
          ) : loadError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {loadError}
            </p>
          ) : count === 0 ? (
            isAuthenticated && (
              <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-5 text-center">
                Zatím žádné hodnocení. Buď první, kdo materiál ohodnotí!
              </p>
            )
          ) : (
            otherRatings.length > 0 && (
              <ul className="space-y-3">
                {otherRatings.map((rating, index) => (
                  <li
                    key={rating.ratingId}
                    className="bg-white border border-gray-200 rounded-lg p-4 row-fade-in hover:shadow-md transition-shadow"
                    style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {rating.userDisplayName ?? "Uživatel"}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatRatingDate(rating.createdAt)}
                        </p>
                      </div>
                      <StarRating rating={rating.score} size={14} />
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-line break-words">
                        {rating.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Smazat hodnocení"
        message="Opravdu chceš smazat své hodnocení? Tato akce je nevratná."
        confirmLabel="Ano, smazat"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </section>
  );
}
