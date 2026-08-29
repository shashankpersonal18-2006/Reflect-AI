import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Goal } from '../../types';
import { createGoal, updateGoal, deleteGoal } from '../../lib/firestore/service';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  TrendingUp,
  X,
  Sparkles,
} from 'lucide-react';

interface GoalsViewProps {
  goals: Goal[];
  onGoalAdded: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ goals, onGoalAdded }) => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);

  const handleOpenCreateModal = () => {
    setTitle('');
    setDescription('');
    setProgress(0);
    setEditingGoal(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setProgress(goal.progress);
    setIsCreateModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    try {
      if (editingGoal) {
        await updateGoal(user.uid, editingGoal.id, {
          title: title.trim(),
          description: description.trim(),
          progress,
        });
        success('Goal updated');
      } else {
        await createGoal(user.uid, {
          title: title.trim(),
          description: description.trim(),
          progress,
        });
        success('Goal created');
        onGoalAdded();
      }
      setIsCreateModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to save goal');
    }
  };

  const handleToggleComplete = async (goal: Goal) => {
    if (!user) return;
    const isCompleted = goal.status === 'completed';
    const newProgress = isCompleted ? 50 : 100;
    try {
      await updateGoal(user.uid, goal.id, {
        progress: newProgress,
        status: isCompleted ? 'active' : 'completed',
      });
      success(isCompleted ? 'Marked active' : 'Goal completed! 🎉');
    } catch (err) {
      showError('Failed to update status');
    }
  };

  const handleIncrementProgress = async (goal: Goal, delta: number) => {
    if (!user) return;
    const nextVal = Math.min(100, Math.max(0, goal.progress + delta));
    try {
      await updateGoal(user.uid, goal.id, {
        progress: nextVal,
      });
    } catch (err) {
      showError('Failed to update progress');
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!user) return;
    if (window.confirm('Delete this goal?')) {
      try {
        await deleteGoal(user.uid, goalId);
        success('Goal removed');
      } catch (err) {
        showError('Failed to delete goal');
      }
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (filterStatus === 'active') return g.status === 'active';
    if (filterStatus === 'completed') return g.status === 'completed';
    return true;
  });

  const activeCount = goals.filter((g) => g.status === 'active').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const avgProgress =
    goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length) : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Personal Goals</h1>
          <p className="text-sm text-slate-400">
            Convert breakthroughs from your reflections into concrete, measurable momentum.
          </p>
        </div>

        <button
          id="goals-new-goal-btn"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-sky-500 hover:bg-sky-400 shadow-md shadow-sky-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Progress Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium mb-1">Active Commitments</div>
          <div className="text-3xl font-extrabold text-white">{activeCount}</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium mb-1">Completed Goals</div>
          <div className="text-3xl font-extrabold text-emerald-400">{completedCount}</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium mb-1">Average Progress</div>
          <div className="text-3xl font-extrabold text-sky-400">{avgProgress}%</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {(['active', 'completed', 'all'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
              filterStatus === st
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st} ({st === 'active' ? activeCount : st === 'completed' ? completedCount : goals.length})
          </button>
        ))}
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
          <Target className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">
            {filterStatus === 'completed' ? 'No completed goals yet' : 'No active goals'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Set ambitious yet realistic goals from your journal sessions to keep yourself focused and inspired.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create a Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === 'completed';
            return (
              <div
                key={goal.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isCompleted
                    ? 'border-emerald-500/20 bg-emerald-950/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(goal)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                      title={isCompleted ? 'Mark active' : 'Mark completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <h3
                        className={`text-base font-bold text-white truncate ${
                          isCompleted ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(goal)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Edit goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Quick Increments */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Progress</span>
                    <span className="font-mono font-bold text-sky-400">{goal.progress}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {/* Quick Increment buttons */}
                  {!isCompleted && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500">Quick adjust:</span>
                      <button
                        onClick={() => handleIncrementProgress(goal, 10)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => handleIncrementProgress(goal, 25)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        +25%
                      </button>
                      <button
                        onClick={() => handleToggleComplete(goal)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors ml-auto"
                      >
                        Mark 100% Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Target className="w-5 h-5 text-sky-400" />
                <span>{editingGoal ? 'Edit Goal' : 'Create Reflection Goal'}</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Goal Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Meditate for 10 minutes every morning"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why is this meaningful to you? What will keeping this commitment unlock?"
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Initial Progress</label>
                  <span className="font-mono text-sky-400">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 shadow-md shadow-sky-500/20"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
