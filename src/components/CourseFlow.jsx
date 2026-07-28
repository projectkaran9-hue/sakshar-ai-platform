import React from 'react';

const LEVEL_LABELS = {
  none: 'Foundational',
  primary: 'Primary',
  middle: 'Middle School',
  high: 'High School',
};

/**
 * CourseFlow — a personalized roadmap of the learner's assigned courses.
 * Renders each assigned lesson as a node in a connected flow, colored by
 * status (completed / current / locked) so the learner can see exactly
 * where they are in their track and what's coming next.
 */
const CourseFlow = ({
  t,
  lessons = [],
  completedLessons = new Set(),
  educationalLevel = 'none',
  fullName = '',
  loading = false,
  onOpenLesson,
}) => {
  const total = lessons.length;
  const completedCount = lessons.filter((l) => completedLessons.has(l.lesson_id)).length;
  const currentIndex = lessons.findIndex((l) => !completedLessons.has(l.lesson_id));
  const hasCurrent = currentIndex !== -1;
  const inProgressCount = hasCurrent ? 1 : 0;
  const lockedCount = hasCurrent ? Math.max(total - currentIndex - 1, 0) : 0;

  const getStatus = (idx) => {
    if (completedLessons.has(lessons[idx].lesson_id)) return 'completed';
    if (idx === currentIndex) return 'current';
    return 'locked';
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Building your course path...</p>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center py-24 animate-fade-in">
        <div className="text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-3xl mx-auto mb-4">📚</div>
          <h3 className="text-base font-black text-gray-900 mb-1.5">No courses assigned yet</h3>
          <p className="text-xs text-gray-500 font-medium">Complete your placement assessment to unlock a personalized course path.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-5 text-gray-800 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🗺️</span> {fullName ? `${fullName}'s` : 'Your'} Course Path
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {LEVEL_LABELS[educationalLevel] || 'Foundational'} track · {total} course{total !== 1 ? 's' : ''} assigned
          </p>
        </div>
        {hasCurrent && (
          <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 self-start sm:self-auto max-w-full truncate">
            ✨ Up next: {lessons[currentIndex].title}
          </span>
        )}
        {!hasCurrent && (
          <span className="text-[10px] font-black text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
            🎉 All assigned courses completed!
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="📚" label="Total Courses" value={total} color="text-gray-700" bg="bg-gray-50" delay="delay-0" />
        <StatCard icon="✅" label="Completed" value={completedCount} color="text-green-600" bg="bg-green-50" delay="delay-1" />
        <StatCard icon="🚀" label="In Progress" value={inProgressCount} color="text-blue-600" bg="bg-blue-50" delay="delay-2" />
        <StatCard icon="🔒" label="Locked" value={lockedCount} color="text-gray-400" bg="bg-gray-50" delay="delay-3" />
      </div>

      {/* Roadmap / flow chart */}
      <div className="flex-1 bg-[#FDFDFD] rounded-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] border border-gray-100 p-6 overflow-y-auto scrollbar-thin min-h-[420px]">
        <div className="max-w-2xl mx-auto relative">
          {lessons.map((les, idx) => {
            const status = getStatus(idx);
            const isLast = idx === lessons.length - 1;
            const clickable = status !== 'locked' && typeof onOpenLesson === 'function';

            return (
              <div key={les.lesson_id || idx} className="relative flex gap-4 pb-8 last:pb-0">
                {/* Connector line down to the next node */}
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-10 bottom-0 w-0.5 animate-line-grow ${
                      status === 'completed' ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  />
                )}

                {/* Status node */}
                <div className="relative shrink-0 z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 shadow-sm
                      ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' : ''}
                      ${status === 'current' ? 'bg-purple-600 border-purple-600 text-white animate-pulse' : ''}
                      ${status === 'locked' ? 'bg-white border-gray-200 text-gray-300' : ''}
                    `}
                  >
                    {status === 'completed' ? '✓' : status === 'locked' ? '🔒' : idx + 1}
                  </div>
                </div>

                {/* Course card */}
                <button
                  type="button"
                  onClick={() => clickable && onOpenLesson(les)}
                  disabled={!clickable}
                  title={status === 'locked' ? 'Complete earlier courses to unlock this one' : undefined}
                  className={`flex-1 text-left bg-white rounded-2xl border p-4 shadow-sm transition-all duration-200 animate-pop-in
                    ${status === 'locked' ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5 hover:border-purple-200 cursor-pointer'}
                    ${status === 'current' ? 'ring-2 ring-purple-200' : ''}
                  `}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-black leading-tight ${status === 'locked' ? 'text-gray-400' : 'text-gray-900'}`}>
                      {les.title}
                    </h4>
                    <StatusBadge status={status} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">
                    Lesson {idx + 1} of {total} · {LEVEL_LABELS[les.level] || les.level || 'General'}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Mini Components ---

const StatCard = ({ icon, label, value, color, bg, delay }) => (
  <div className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3 animate-pop-in ${delay} hover-lift`}>
    <div className={`w-10 h-10 shrink-0 rounded-xl ${bg} ${color} flex items-center justify-center text-lg`}>{icon}</div>
    <div>
      <p className="text-lg font-black text-gray-900 animate-number-pop">{value}</p>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{label}</p>
    </div>
  </div>
);

const STATUS_CONFIG = {
  completed: { label: 'Completed', className: 'text-green-700 bg-green-50 border-green-100' },
  current: { label: 'In Progress', className: 'text-purple-700 bg-purple-50 border-purple-100' },
  locked: { label: 'Locked', className: 'text-gray-400 bg-gray-50 border-gray-100' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

export default CourseFlow;