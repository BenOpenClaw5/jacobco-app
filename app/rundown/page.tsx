'use client';

import { useState, useEffect, useCallback } from 'react';
import GlobalNav from '@/components/GlobalNav';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, MessageSquare, ChevronDown, ChevronUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type Status = 'todo' | 'in_progress' | 'done';
type Category = 'shop' | 'events' | 'admin' | 'finance' | 'other';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  category: Category;
  assigned_to: string[];
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
}

interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = ['Jacob', 'Courtney', 'Heather', 'Augustus', 'Tommy', 'Jace', 'Ben', 'Van', 'Max', 'Mia', 'Abby', 'Eden'];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  urgent: { label: 'Urgent',  color: 'rgb(239,68,68)',   bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   dot: '#ef4444' },
  high:   { label: 'High',    color: 'rgb(251,146,60)',   bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  dot: '#fb923c' },
  medium: { label: 'Medium',  color: 'rgb(96,165,250)',   bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  dot: '#60a5fa' },
  low:    { label: 'Low',     color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.3)' },
};

const STATUS_CONFIG: Record<Status, { label: string }> = {
  todo:        { label: 'To Do' },
  in_progress: { label: 'In Progress' },
  done:        { label: 'Done' },
};

const CATEGORY_LABELS: Record<Category, string> = {
  shop: 'Shop', events: 'Events', admin: 'Admin', finance: 'Finance', other: 'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done') return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: (task: Task) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<Status>('todo');
  const [category, setCategory] = useState<Category>('other');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        priority, status, category,
        assigned_to: assignedTo,
        due_date: dueDate || null,
        created_by: createdBy.trim() || null,
      }).select('*').single();
      if (error) throw error;
      onCreated(data as Task);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  function toggleAssignee(name: string) {
    setAssignedTo(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-6"
      onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
            New Task
          </span>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-dim)' }}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              required
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-urbanist)', fontWeight: 300, fontSize: '16px', padding: '0 0 8px', outline: 'none' }}
              className="placeholder:opacity-30"
            />
          </div>

          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)..."
              rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '13px', padding: '10px 12px', outline: 'none', resize: 'none' }}
              className="placeholder:opacity-30"
            />
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '8px' }}>Priority</label>
            <div className="flex gap-2 flex-wrap">
              {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button type="button" key={p} onClick={() => setPriority(p)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
                      fontFamily: 'var(--font-josefin)',
                      background: priority === p ? cfg.bg : 'transparent',
                      border: `1px solid ${priority === p ? cfg.border : 'var(--border)'}`,
                      color: priority === p ? cfg.color : 'var(--text-dim)',
                      transition: 'all 150ms ease',
                    }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category)}
                style={{ width: '100%', background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-josefin)', fontSize: '10px', letterSpacing: '0.1em', padding: '7px 10px', outline: 'none' }}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Status)}
                style={{ width: '100%', background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-josefin)', fontSize: '10px', letterSpacing: '0.1em', padding: '7px 10px', outline: 'none' }}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Due Date & Created By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '12px', padding: '7px 10px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>Created By</label>
              <select value={createdBy} onChange={e => setCreatedBy(e.target.value)}
                style={{ width: '100%', background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-josefin)', fontSize: '10px', letterSpacing: '0.1em', padding: '7px 10px', outline: 'none' }}>
                <option value="">—</option>
                {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '8px' }}>Assign To</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_MEMBERS.map(name => {
                const sel = assignedTo.includes(name);
                return (
                  <button type="button" key={name} onClick={() => toggleAssignee(name)}
                    style={{
                      padding: '3px 8px', fontSize: '10px', fontFamily: 'var(--font-josefin)',
                      background: sel ? 'rgba(196,154,42,0.15)' : 'transparent',
                      border: `1px solid ${sel ? 'rgba(196,154,42,0.5)' : 'var(--border)'}`,
                      color: sel ? 'var(--accent)' : 'var(--text-dim)',
                      transition: 'all 150ms ease',
                    }}>
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button type="submit" disabled={saving || !title.trim()}
            className="w-full py-3 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-2"
            style={{
              background: 'transparent',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-josefin)',
              opacity: !title.trim() ? 0.4 : 1,
            }}>
            {saving && <Loader2 size={11} className="animate-spin" />}
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onUpdated, onDeleted }: {
  task: Task;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const overdue = isOverdue(task);
  const cfg = PRIORITY_CONFIG[task.priority];
  const isDone = task.status === 'done';

  async function loadComments() {
    if (loadingComments || comments.length > 0) return;
    setLoadingComments(true);
    try {
      const { data } = await supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at');
      setComments((data ?? []) as Comment[]);
    } catch { /* ignore */ }
    finally { setLoadingComments(false); }
  }

  function handleExpand() {
    if (!expanded) loadComments();
    setExpanded(v => !v);
  }

  async function toggleDone() {
    setUpdatingStatus(true);
    const newStatus: Status = isDone ? 'todo' : 'done';
    try {
      const updates: Partial<Task> = { status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null };
      await supabase.from('tasks').update(updates).eq('id', task.id);
      onUpdated({ ...task, ...updates });
    } catch { /* ignore */ }
    finally { setUpdatingStatus(false); }
  }

  async function addComment() {
    if (!newComment.trim() || !commentAuthor) return;
    setSavingComment(true);
    try {
      const { data } = await supabase.from('task_comments').insert({
        task_id: task.id, author: commentAuthor, content: newComment.trim(),
      }).select('*').single();
      if (data) setComments(prev => [...prev, data as Comment]);
      setNewComment('');
    } catch { /* ignore */ }
    finally { setSavingComment(false); }
  }

  return (
    <div
      style={{
        border: `1px solid ${overdue && !isDone ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
        background: isDone ? 'rgba(255,255,255,0.02)' : 'var(--card)',
        marginBottom: '8px',
        animation: overdue && !isDone ? 'pulse-urgent 2s ease-in-out infinite' : 'none',
        opacity: isDone ? 0.55 : 1,
        transition: 'opacity 200ms ease, border-color 200ms ease',
      }}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Done toggle */}
        <button onClick={toggleDone} disabled={updatingStatus} className="mt-0.5 flex-shrink-0">
          {isDone
            ? <Check size={16} strokeWidth={2} style={{ color: 'rgba(34,197,94,0.7)' }} />
            : <div style={{ width: 16, height: 16, border: `1.5px solid ${cfg.border}`, borderRadius: 2 }} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              style={{
                fontSize: '13px', fontWeight: 300, color: isDone ? 'var(--text-dim)' : 'var(--text-primary)',
                fontFamily: 'var(--font-josefin)', letterSpacing: '0.02em',
                textDecoration: isDone ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Priority badge */}
              <span style={{
                fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: 'var(--font-josefin)',
                padding: '2px 6px',
                background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
              }}>{cfg.label}</span>
              {/* Expand */}
              <button onClick={handleExpand} style={{ color: 'var(--text-dim)' }}>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>
              {CATEGORY_LABELS[task.category]}
            </span>
            {task.assigned_to?.length > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                {task.assigned_to.join(', ')}
              </span>
            )}
            {task.due_date && (
              <span style={{ fontSize: '10px', color: overdue && !isDone ? 'rgb(239,68,68)' : 'var(--text-dim)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, display: 'flex', alignItems: 'center', gap: '3px' }}>
                {overdue && !isDone && <AlertTriangle size={10} />}
                {formatDate(task.due_date)}
              </span>
            )}
            {task.status === 'in_progress' && (
              <span style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)', color: 'rgb(96,165,250)', padding: '1px 5px', border: '1px solid rgba(96,165,250,0.25)' }}>
                In Progress
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 14px' }}>
          {task.description && (
            <p style={{ fontSize: '12px', fontWeight: 200, color: 'var(--text-secondary)', fontFamily: 'var(--font-urbanist)', lineHeight: 1.6, marginBottom: '12px' }}>
              {task.description}
            </p>
          )}

          {/* Status toggle */}
          <div className="flex gap-2 mb-3">
            {(['todo', 'in_progress', 'done'] as Status[]).map(s => (
              <button key={s} onClick={async () => {
                if (task.status === s) return;
                const updates: Partial<Task> = { status: s, completed_at: s === 'done' ? new Date().toISOString() : null };
                await supabase.from('tasks').update(updates).eq('id', task.id);
                onUpdated({ ...task, ...updates });
              }}
                style={{
                  fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)',
                  padding: '3px 8px',
                  background: task.status === s ? 'rgba(196,154,42,0.15)' : 'transparent',
                  border: `1px solid ${task.status === s ? 'rgba(196,154,42,0.5)' : 'var(--border)'}`,
                  color: task.status === s ? 'var(--accent)' : 'var(--text-dim)',
                }}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Comments */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={9} />
              Comments
            </div>
            {loadingComments && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-dim)' }} />}
            {comments.map(c => (
              <div key={c.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '10px', fontWeight: 300, color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>{c.author}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-urbanist)' }}>{formatTimestamp(c.created_at)}</span>
                </div>
                <p style={{ fontSize: '12px', fontWeight: 200, color: 'var(--text-secondary)', fontFamily: 'var(--font-urbanist)', lineHeight: 1.5 }}>{c.content}</p>
              </div>
            ))}
            {/* Add comment */}
            <div className="flex gap-2 mt-2">
              <select value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)}
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.1em', padding: '5px 8px', outline: 'none', flexShrink: 0 }}>
                <option value="">Who?</option>
                {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                placeholder="Add a comment..."
                style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '12px', padding: '4px 0', outline: 'none' }}
                className="placeholder:opacity-30" />
              <button onClick={addComment} disabled={savingComment || !newComment.trim() || !commentAuthor}
                style={{ color: 'var(--accent)', opacity: (!newComment.trim() || !commentAuthor) ? 0.3 : 1 }}>
                {savingComment ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Priority Column ──────────────────────────────────────────────────────────

function PriorityGroup({ priority, tasks, onUpdated, onDeleted }: {
  priority: Priority;
  tasks: Task[];
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const cfg = PRIORITY_CONFIG[priority];
  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');
  const [showDone, setShowDone] = useState(false);

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Priority header */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)', color: cfg.color }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>
          · {active.length}
        </span>
      </div>

      {active.length === 0 && (
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, padding: '12px 0', fontStyle: 'italic' }}>
          No tasks
        </div>
      )}

      {active.map(t => (
        <TaskCard key={t.id} task={t} onUpdated={onUpdated} onDeleted={onDeleted} />
      ))}

      {done.length > 0 && (
        <button onClick={() => setShowDone(v => !v)}
          style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          {showDone ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {done.length} completed
        </button>
      )}
      {showDone && done.map(t => (
        <TaskCard key={t.id} task={t} onUpdated={onUpdated} onDeleted={onDeleted} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RundownPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [filterMember, setFilterMember] = useState<string>('all');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      setTasks((data ?? []) as Task[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  function handleCreated(task: Task) {
    setTasks(prev => [task, ...prev]);
    setShowCreate(false);
  }

  function handleUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function handleDeleted(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  // Filter
  const filtered = tasks.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterMember !== 'all' && !t.assigned_to?.includes(filterMember)) return false;
    return true;
  });

  // Group by priority
  const byPriority: Record<Priority, Task[]> = { urgent: [], high: [], medium: [], low: [] };
  for (const t of filtered) byPriority[t.priority].push(t);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <GlobalNav />

      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-end justify-between gap-4 max-w-4xl mx-auto">
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
              Jacob Co Creative
            </div>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 100, letterSpacing: '0.08em', color: 'var(--text-primary)', fontFamily: 'var(--font-josefin)' }}>
              The Rundown
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase' }}
          >
            <Plus size={11} strokeWidth={1.5} />
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4 max-w-4xl mx-auto flex-wrap">
          {/* Category filter */}
          <div className="flex items-center gap-1">
            {(['all', 'shop', 'events', 'admin', 'finance', 'other'] as const).map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                style={{
                  padding: '4px 10px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
                  fontFamily: 'var(--font-josefin)',
                  background: filterCategory === c ? 'rgba(196,154,42,0.12)' : 'transparent',
                  border: `1px solid ${filterCategory === c ? 'rgba(196,154,42,0.4)' : 'var(--border)'}`,
                  color: filterCategory === c ? 'var(--accent)' : 'var(--text-dim)',
                  transition: 'all 150ms ease',
                }}>
                {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {/* Member filter */}
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.1em', padding: '5px 10px', outline: 'none' }}>
            <option value="all">All Members</option>
            {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Main content */}
      <main className="px-5 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-dim)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <PriorityGroup priority="urgent" tasks={byPriority.urgent} onUpdated={handleUpdated} onDeleted={handleDeleted} />
              <PriorityGroup priority="medium" tasks={byPriority.medium} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            </div>
            <div>
              <PriorityGroup priority="high" tasks={byPriority.high} onUpdated={handleUpdated} onDeleted={handleDeleted} />
              <PriorityGroup priority="low" tasks={byPriority.low} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            </div>
          </div>
        )}
      </main>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  );
}
