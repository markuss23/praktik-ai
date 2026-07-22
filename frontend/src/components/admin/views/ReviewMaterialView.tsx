'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ReviewVerdict } from '@/api';
import type { PubResource } from '@/api';
import {
  getResource,
  createResourceReview,
  updateResourcePublicState,
  listResourceComments,
  createResourceComment,
  deleteResourceComment,
  type ResourceComment,
} from '@/lib/api-client';
import { mapPubResourceToMaterial } from '@/components/material/api';
import type { Material } from '@/components/material/types';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { REVIEW_COUNT_EVENT } from '@/components/admin/AdminSidebar';
import {
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Download,
  FileText,
  RotateCcw,
  Globe,
  EyeOff,
  Send,
  Trash2,
} from 'lucide-react';
import { PageSpinner } from '@/components/ui';

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMin < 1) return 'Právě teď';
  if (diffMin < 60) return `Před ${diffMin}m`;
  if (diffHours < 24) return `Před ${diffHours}h`;
  if (diffDays === 1) return 'Před 1 dnem';
  return `Před ${diffDays} dny`;
}

interface ReviewMaterialViewProps {
  resourceId: number;
}

export function ReviewMaterialView({ resourceId }: ReviewMaterialViewProps) {
  const router = useRouter();
  const { isGuarantor, isSuperAdmin } = useRole();
  const { currentUser, isOwner } = useCurrentUser();

  const [resource, setResource] = useState<PubResource | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const [actionLoading, setActionLoading] = useState<null | 'approve' | 'return'>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [approvedTransition, setApprovedTransition] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await getResource(resourceId);
        if (cancelled) return;
        setResource(res);
        setMaterial(mapPubResourceToMaterial(res));
        try {
          const list = await listResourceComments(resourceId);
          if (!cancelled) setComments(list);
        } catch {
          // komentáře nemusí existovat
        }
      } catch (err) {
        console.error('Failed to load material:', err);
        if (!cancelled) setError('Nepodařilo se načíst materiál.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [resourceId]);

  const isPending = resource?.status === 'pending_review';
  const isApproved = resource?.status === 'approved';
  const isRejected = resource?.status === 'rejected';
  // Backend dovolí recenzi garantovi/superadminovi nezávisle na vlastnictví.
  const canReview = isGuarantor && isPending;
  // Publikovat / skrýt smí na backendu jen vlastník nebo superadmin a jen u schváleného materiálu.
  const canManageVisibility =
    !!resource && isApproved && (isSuperAdmin || isOwner(resource.authorId));
  // Smazat komentář smí jeho autor (garant) nebo superadmin.
  const canDeleteComment = (authorId: number) =>
    isSuperAdmin || (isGuarantor && authorId === currentUser?.userId);

  const submitReview = async (verdict: ReviewVerdict) => {
    if (!resource) return;
    setActionLoading(verdict === ReviewVerdict.Approved ? 'approve' : 'return');
    setError(null);
    try {
      const updated = await createResourceReview(resourceId, {
        verdict,
        notes: null,
      });
      setResource(updated);
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
      if (verdict === ReviewVerdict.Approved) {
        // Po schválení zůstaň na stránce, pokud lze materiál rovnou publikovat/skrýt,
        // jinak se vrať na přehled.
        const canManageAfter = isSuperAdmin || isOwner(updated.authorId);
        setApprovedTransition(true);
        setTimeout(() => {
          if (canManageAfter) {
            setApprovedTransition(false);
            setActionLoading(null);
          } else {
            router.push('/admin/review');
          }
        }, 1600);
      } else {
        router.push('/admin/review');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit rozhodnutí.');
      setActionLoading(null);
    }
  };

  const togglePublic = async () => {
    if (!resource) return;
    setVisibilityLoading(true);
    setError(null);
    try {
      const updated = await updateResourcePublicState(resource.resourceId, !resource.isPublic);
      setResource(updated);
    } catch (err) {
      console.error('Failed to update visibility:', err);
      setError(err instanceof Error ? err.message : 'Nepodařilo se změnit viditelnost.');
    } finally {
      setVisibilityLoading(false);
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const created = await createResourceComment(resourceId, text);
      setComments((prev) => [created, ...prev]);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      setCommentError(err instanceof Error ? err.message : 'Nepodařilo se odeslat komentář.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    setDeletingCommentId(commentId);
    try {
      await deleteResourceComment(resourceId, commentId);
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  if (loading) return <PageSpinner message="Načítání materiálu…" />;

  if (error && !resource) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push('/admin/review')} className="text-purple-600 hover:underline">
            ← Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  if (!resource || !material) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">
            <button onClick={() => router.push('/admin/review')} className="hover:text-gray-700">
              Ke schválení
            </button>
            {' / '}
            <span className="text-gray-700 truncate">{resource.title}</span>
          </p>
          <h1 className="text-xl font-bold text-black">Materiál ke schválení</h1>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Rozhodnutí garanta (jen u čekajících materiálů) */}
          {canReview && (
            <>
              <button
                onClick={() => submitReview(ReviewVerdict.NeedsRevision)}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                <ThumbsDown size={16} />
                {actionLoading === 'return' ? 'Vracím…' : 'Vrátit k přepracování'}
              </button>
              <button
                onClick={() => submitReview(ReviewVerdict.Approved)}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <ThumbsUp size={16} />
                {actionLoading === 'approve' ? 'Schvaluji…' : 'Schválit materiál'}
              </button>
            </>
          )}
          {/* Stavové odznaky */}
          {isApproved && (
            <>
              <span className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                <CheckCircle size={15} />
                Schváleno
              </span>
              <span
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
                  resource.isPublic
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {resource.isPublic ? <Globe size={15} /> : <EyeOff size={15} />}
                {resource.isPublic ? 'Veřejný' : 'Skrytý'}
              </span>
            </>
          )}
          {isRejected && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
              <RotateCcw size={15} />
              Vráceno autorovi
            </span>
          )}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Center: material content */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-black mb-2">{resource.title}</h2>
            {material.description && (
              <p className="text-sm text-gray-600 mb-5 whitespace-pre-wrap">{material.description}</p>
            )}

            {/* Metadata */}
            {material.targets && material.targets.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {material.targets.map((target, index) => (
                    <div key={`${target.label}-${index}`} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">{target.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{target.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            <h3 className="text-lg font-bold text-black mb-3">Přílohy</h3>
            {material.attachments && material.attachments.length > 0 ? (
              <ul className="space-y-2">
                {material.attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 text-gray-700 flex-shrink-0">
                        <FileText size={18} strokeWidth={1.75} />
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-xs text-gray-500">{attachment.format}</span>
                      {attachment.url ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Download size={14} strokeWidth={1.75} />
                          Stáhnout
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Bez souboru</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Materiál nemá žádné přílohy.</p>
            )}
          </div>
        </div>

        {/* Right: comments panel */}
        <div className="w-72 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-black">
              Komentáře{comments.length > 0 && ` (${comments.length})`}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Zatím žádné komentáře</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.commentId} className="bg-gray-100 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-xs">
                      {comment.authorDisplayName ?? 'Garant'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                      {canDeleteComment(comment.authorId) && (
                        <button
                          onClick={() => handleDeleteComment(comment.commentId)}
                          disabled={deletingCommentId === comment.commentId}
                          className="p-0.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          aria-label="Smazat komentář"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">{comment.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Akční zóna: u čekajících přidání komentáře, u schválených publikace/skrytí */}
          {canReview ? (
            <div className="p-3 border-t border-gray-200 flex-shrink-0 space-y-2">
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  placeholder="Přidat komentář…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || commentSubmitting}
                  className="self-end p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  aria-label="Odeslat komentář"
                >
                  <Send size={14} />
                </button>
              </div>
              {commentError && <p className="text-xs text-red-600">{commentError}</p>}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          ) : canManageVisibility ? (
            <div className="p-3 border-t border-gray-200 flex-shrink-0 space-y-2">
              <p className="text-xs text-gray-500">
                {resource.isPublic
                  ? 'Materiál je publikovaný ve veřejné databázi.'
                  : 'Materiál je schválený, ale zatím není publikovaný.'}
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {resource.isPublic ? (
                <button
                  onClick={togglePublic}
                  disabled={visibilityLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <EyeOff size={13} />
                  {visibilityLoading ? 'Skrývám…' : 'Skrýt z databáze'}
                </button>
              ) : (
                <button
                  onClick={togglePublic}
                  disabled={visibilityLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Globe size={13} />
                  {visibilityLoading ? 'Publikuji…' : 'Publikovat do databáze'}
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                {isApproved
                  ? 'Materiál je schválený – komentáře jsou uzavřeny.'
                  : isRejected
                    ? 'Materiál byl vrácen autorovi k přepracování.'
                    : 'Materiál není ve stavu ke schválení.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Přechodová animace po schválení */}
      <AnimatePresence>
        {approvedTransition && (
          <motion.div
            key="approved-transition"
            className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="absolute inset-0 bg-white/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-2xl bg-white shadow-xl border border-green-100"
              initial={{ scale: 0.85, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
              >
                <CheckCircle size={36} className="text-green-600" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Materiál schválen</p>
                <p className="text-sm text-gray-500 mt-1">
                  {canManageVisibility
                    ? 'Nyní jej můžete publikovat nebo skrýt.'
                    : 'Vracím vás na přehled…'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReviewMaterialView;
