import React, { memo } from 'react';
import { 
  Clock, CheckCircle2, Circle, Trash2, Edit2, 
  Briefcase, Zap, Coffee, Trash, Heart, Droplets, Trophy, Star
} from 'lucide-react';
import { cn, Button, Card, Badge } from './UI';
import { Task, TimeBlock, DayPlan } from '../types';

interface TaskItemProps {
  task: Task;
  isExpanded: boolean;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export const TaskItem = memo(({ task, isExpanded, onToggle, onDelete, onToggleExpand }: TaskItemProps) => {
  return (
    <div 
      className={cn(
        "group flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-slate-50 border border-transparent",
        task.status === 'Done' ? "opacity-60" : "hover:border-slate-200"
      )}
    >
      <button 
        onClick={() => onToggle(task)}
        className={cn(
          "flex-shrink-0 transition-colors",
          task.status === 'Done' ? "text-emerald-500" : "text-slate-300 hover:text-indigo-500"
        )}
      >
        {task.status === 'Done' ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-slate-900 truncate",
          task.status === 'Done' && "line-through text-slate-400"
        )}>
          {task.title}
        </p>
        {task.description && (
          <div className="mt-1">
            {!isExpanded ? (
              <p className={cn(
                "text-xs text-slate-500 line-clamp-1",
                task.status === 'Done' && "line-through opacity-50"
              )}>
                {task.description}
              </p>
            ) : (
              <div className={cn(
                "text-xs text-slate-700 mt-2 p-3 bg-slate-100/80 rounded-lg border border-slate-200 shadow-inner whitespace-pre-wrap leading-relaxed",
                task.status === 'Done' && "opacity-70"
              )}>
                {task.description}
              </div>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(task.id);
              }}
              className="text-[10px] text-indigo-600 font-bold hover:underline mt-1 flex items-center gap-1"
            >
              {isExpanded ? "Show Less" : "View Description"}
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 mt-1">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1.5 py-0",
              task.priority === 'Critical' ? "text-rose-600 border-rose-200 bg-rose-50" :
              task.priority === 'High' ? "text-orange-600 border-orange-200 bg-orange-50" :
              "text-slate-500 border-slate-200 bg-slate-50"
            )}
          >
            {task.priority}
          </Badge>
          {task.startTime && (
            <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.startTime}
            </span>
          )}
          {task.estimatedHours > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {task.estimatedHours}h
            </span>
          )}
        </div>
      </div>
      <button 
        onClick={() => onDelete(task.id)}
        className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
        title="Delete Task"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

interface RoutineItemProps {
  item: { id: string; title: string; completed: boolean };
  onToggle: (id: string, completed: boolean) => void;
}

export const RoutineItem = memo(({ item, onToggle }: RoutineItemProps) => {
  return (
    <button 
      onClick={() => onToggle(item.id, !item.completed)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
        item.completed 
          ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
          : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
      )}
    >
      {item.completed ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Circle className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">{item.title}</span>
    </button>
  );
});

interface TimeBlockItemProps {
  block: TimeBlock;
  onClick: (block: TimeBlock) => void;
  onDelete: (id: string) => void;
}

export const TimeBlockItem = memo(({ block, onClick, onDelete }: TimeBlockItemProps) => {
  return (
    <div 
      onClick={() => onClick(block)}
      className={cn(
        "p-3 rounded-xl border text-sm font-medium shadow-sm transition-all hover:shadow-md cursor-pointer relative group/block",
        block.color
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest opacity-70">
          {block.startTime} - {block.endTime}
        </span>
        <div className="flex items-center gap-1">
          {block.type === 'work' && <Briefcase className="w-3 h-3 opacity-70" />}
          {block.type === 'meeting' && <Zap className="w-3 h-3 opacity-70" />}
          {block.type === 'break' && <Coffee className="w-3 h-3 opacity-70" />}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            className="p-1 opacity-0 group-hover/block:opacity-100 hover:text-rose-600 transition-all"
          >
            <Trash className="w-3 h-3" />
          </button>
        </div>
      </div>
      <p className="truncate">{block.title}</p>
    </div>
  );
});

interface WellnessTrackerProps {
  waterIntake: number;
  mood: string | null;
  onUpdateWater: (val: number) => void;
  onUpdateMood: (val: string) => void;
}

export const WellnessTracker = memo(({ waterIntake, mood, onUpdateWater, onUpdateMood }: WellnessTrackerProps) => {
  return (
    <Card className="p-5 border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Heart className="w-4 h-4 text-rose-500" />
        Wellness
      </h3>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Water Intake</span>
          <span className="text-xs font-bold text-blue-600">{waterIntake} / 8 glasses</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <button 
              key={i}
              onClick={() => onUpdateWater(i + 1)}
              className={cn(
                "flex-1 h-8 rounded-md transition-all",
                i < waterIntake ? "bg-blue-500 shadow-sm shadow-blue-200" : "bg-slate-100 hover:bg-slate-200"
              )}
            >
              <Droplets className={cn("w-4 h-4 mx-auto", i < waterIntake ? "text-white" : "text-slate-300")} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Daily Mood</span>
        <div className="flex justify-between">
          {['😔', '😐', '🙂', '😊', '🤩'].map((m, i) => (
            <button 
              key={i}
              onClick={() => onUpdateMood(m)}
              className={cn(
                "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all",
                mood === m ? "bg-indigo-100 scale-110 shadow-sm" : "hover:bg-slate-50"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
});

interface GratitudeWinsProps {
  gratitude: string;
  wins: string;
  onUpdateGratitude: (val: string) => void;
  onUpdateWins: (val: string) => void;
}

export const GratitudeWins = memo(({ gratitude, wins, onUpdateGratitude, onUpdateWins }: GratitudeWinsProps) => {
  const [localGratitude, setLocalGratitude] = React.useState(gratitude);
  const [localWins, setLocalWins] = React.useState(wins);

  React.useEffect(() => {
    setLocalGratitude(gratitude);
  }, [gratitude]);

  React.useEffect(() => {
    setLocalWins(wins);
  }, [wins]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-5 border-amber-100 bg-amber-50/30 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-amber-500" />
          Gratitude
        </h3>
        <textarea 
          value={localGratitude}
          onChange={(e) => setLocalGratitude(e.target.value)}
          onBlur={() => onUpdateGratitude(localGratitude)}
          placeholder="What are you thankful for today?"
          className="w-full bg-transparent border-none p-0 text-sm text-slate-700 placeholder:text-slate-300 focus:ring-0 resize-none h-24"
        />
      </Card>
      <Card className="p-5 border-emerald-100 bg-emerald-50/30 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-500" />
          Daily Wins
        </h3>
        <textarea 
          value={localWins}
          onChange={(e) => setLocalWins(e.target.value)}
          onBlur={() => onUpdateWins(localWins)}
          placeholder="What did you achieve today?"
          className="w-full bg-transparent border-none p-0 text-sm text-slate-700 placeholder:text-slate-300 focus:ring-0 resize-none h-24"
        />
      </Card>
    </div>
  );
});

interface DailyFocusProps {
  focus: string;
  onUpdate: (val: string) => void;
}

export const DailyFocus = memo(({ focus, onUpdate }: DailyFocusProps) => {
  const [localFocus, setLocalFocus] = React.useState(focus);

  React.useEffect(() => {
    setLocalFocus(focus);
  }, [focus]);

  return (
    <Card className="p-6 border-indigo-100 bg-indigo-50/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Star className="w-16 h-16 text-indigo-600 fill-indigo-600" />
      </div>
      <div className="relative z-10">
        <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 block">
          Main Focus for Today
        </label>
        <input 
          type="text"
          value={localFocus}
          onChange={(e) => setLocalFocus(e.target.value)}
          onBlur={() => onUpdate(localFocus)}
          placeholder="What's the one thing that must get done?"
          className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:ring-0"
        />
      </div>
    </Card>
  );
});
