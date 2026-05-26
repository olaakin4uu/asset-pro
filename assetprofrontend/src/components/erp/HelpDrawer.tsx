'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Search, BookOpen, ChevronRight, ArrowLeft, MessageSquare, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { helpApi, HelpArticle } from '@/lib/api/help';

// ============================================================================
// TYPES
// ============================================================================

export interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
  moduleSlug: string | null;
}

const DIFFICULTY_BADGES: Record<string, { label: string; className: string }> = {
  beginner: { label: 'Beginner', className: 'bg-green-100 text-green-700' },
  intermediate: { label: 'Intermediate', className: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: 'Advanced', className: 'bg-red-100 text-red-700' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HelpDrawer({ open, onClose, moduleSlug }: HelpDrawerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<HelpArticle[]>([]);
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus trap
  useFocusTrap({
    enabled: open && mounted,
    containerRef: panelRef,
    initialFocusSelector: 'input:not([disabled])',
  });

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArticle) {
          setSelectedArticle(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, selectedArticle]);

  // Load suggestions when module changes
  useEffect(() => {
    if (open && moduleSlug) {
      loadSuggestions(moduleSlug);
    }
  }, [open, moduleSlug]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setSelectedArticle(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open]);

  const loadSuggestions = async (slug: string) => {
    try {
      setLoading(true);
      const data = await helpApi.articles.getSuggestions(slug);
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await helpApi.articles.search({ query, limit: 10 });
      setSearchResults(response.results.map((r) => r.article));
    } catch {
      setSearchResults([]);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleArticleClick = async (article: HelpArticle) => {
    // Load full article content
    try {
      const full = await helpApi.articles.getBySlug(article.slug, true);
      setSelectedArticle(full);
    } catch {
      setSelectedArticle(article);
    }
  };

  const renderMarkdown = (markdown: string) => {
    let html = markdown;
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-100 p-3 rounded my-3 overflow-x-auto text-sm"><code>$1</code></pre>');
    html = html.replace(/`(.*?)`/gim, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>');
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-5 list-disc">$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-5 list-decimal">$1</li>');
    html = html.replace(/\n\n/g, '</p><p class="mb-3">');
    html = html.replace(/\n/g, '<br>');
    if (!html.startsWith('<h') && !html.startsWith('<p')) {
      html = `<p class="mb-3">${html}</p>`;
    }
    return html;
  };

  const displayArticles = searchQuery.trim() ? searchResults : suggestions;

  if (!mounted || !open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        className={cn(
          'fixed top-0 right-0 h-full w-[400px] bg-background shadow-xl z-50',
          'flex flex-col',
          'animate-in slide-in-from-right duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          {selectedArticle ? (
            <button
              onClick={() => setSelectedArticle(null)}
              className="flex items-center gap-2 text-sm font-medium hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to articles
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">Help</h2>
              {moduleSlug && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {moduleSlug}
                </span>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedArticle ? (
            /* Article View */
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{selectedArticle.title}</h2>
              <div className="flex items-center gap-2 mb-4">
                {selectedArticle.category && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {selectedArticle.category.name}
                  </span>
                )}
                {selectedArticle.difficulty && DIFFICULTY_BADGES[selectedArticle.difficulty] && (
                  <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_BADGES[selectedArticle.difficulty].className}`}>
                    {DIFFICULTY_BADGES[selectedArticle.difficulty].label}
                  </span>
                )}
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedArticle.content) }}
              />
            </div>
          ) : (
            /* List View */
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search help articles..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-sm"
                />
              </div>

              {/* Section Title */}
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {searchQuery.trim()
                  ? `Search results (${searchResults.length})`
                  : moduleSlug
                    ? `Suggested for ${moduleSlug}`
                    : 'Popular articles'}
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : displayArticles.length > 0 ? (
                <div className="space-y-2">
                  {displayArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium leading-tight">{article.title}</h4>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {article.difficulty && DIFFICULTY_BADGES[article.difficulty] && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${DIFFICULTY_BADGES[article.difficulty].className}`}>
                            {DIFFICULTY_BADGES[article.difficulty].label}
                          </span>
                        )}
                        {article.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {article.category.name}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery.trim()
                      ? 'No articles found for your search'
                      : 'No suggested articles for this page'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 space-y-2 shrink-0">
          <button
            onClick={() => { onClose(); router.push('/help'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Browse All Help Articles
          </button>
          <button
            onClick={() => { onClose(); router.push('/help/support/create'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Support
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
