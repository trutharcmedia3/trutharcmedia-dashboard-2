/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, MessageSquare, Send, Filter, MoreVertical, 
  AlertCircle, CheckCircle2, Info, User, Clock
} from 'lucide-react';
import { useApp } from '../AppContext';
import { 
  Card, CardHeader, CardContent, Button, Input, Select, Badge, cn
} from '../components/UI';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Project, Comment } from '../types';

export const Comments: React.FC = () => {
  const { projects, clients, teamMembers, comments, addComment } = useApp();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [commentTypeFilter, setCommentTypeFilter] = useState('All');
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<Comment['type']>('General Note');
  const [isIssue, setIsIssue] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const client = clients.find(c => c.id === p.clientId);
      return (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
             (client?.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [projects, clients, searchTerm]);

  const projectComments = useMemo(() => {
    return comments
      .filter(c => c.projectId === selectedProjectId)
      .filter(c => commentTypeFilter === 'All' || c.type === commentTypeFilter)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime();
      });
  }, [comments, selectedProjectId, commentTypeFilter]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    addComment({
      projectId: selectedProjectId,
      authorId: 'tm-1', // Mocking as Alex Rivera
      type: newCommentType,
      content: newCommentText,
      isIssue: isIssue,
    });

    setNewCommentText('');
    setIsIssue(false);
  };

  const getTypeIcon = (type: Comment['type']) => {
    switch (type) {
      case 'Issue Reported': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'Resolution': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Client Feedback': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'Progress Update': return <Clock className="w-4 h-4 text-indigo-500" />;
      case 'Revision': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Important': return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-6">
      {/* Left Panel - Project List */}
      <Card className="w-80 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredProjects.map(project => {
            const commentCount = comments.filter(c => c.projectId === project.id).length;
            const client = clients.find(c => c.id === project.clientId);
            const isActive = selectedProjectId === project.id;

            return (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-slate-50 transition-colors flex items-start gap-3",
                  isActive ? "bg-indigo-50 border-indigo-100" : "hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs",
                  isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {project.title?.split(' ')?.map(n => n[0]).join('') || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-sm font-bold truncate", isActive ? "text-indigo-900" : "text-slate-900")}>
                      {project.title}
                    </h4>
                    {commentCount > 0 && (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                        {commentCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{client?.company}</p>
                  <Badge variant={project.status === 'Completed' ? 'success' : 'primary'} className="mt-2 text-[10px] py-0">
                    {project.status}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Right Panel - Comment Thread */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedProject ? (
          <>
            <CardHeader className="flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold">
                  {selectedProject.title?.split(' ')?.map(n => n[0]).join('') || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedProject.title}</h3>
                  <p className="text-xs text-slate-500">Internal discussion thread</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select 
                  className="h-8 text-xs w-40"
                  value={commentTypeFilter}
                  onChange={(e) => setCommentTypeFilter(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="Progress Update">Progress Updates</option>
                  <option value="Client Feedback">Client Feedback</option>
                  <option value="Issue Reported">Issues</option>
                  <option value="Resolution">Resolutions</option>
                  <option value="Revision">Revisions</option>
                  <option value="Important">Important</option>
                  <option value="General Note">General Notes</option>
                </Select>
                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {projectComments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No comments yet for this project.</p>
                  <p className="text-xs">Start the conversation below.</p>
                </div>
              ) : (
                projectComments.map((comment) => {
                  const author = teamMembers.find(tm => tm.id === comment.authorId);
                  return (
                    <div key={comment.id} className={cn(
                      "flex gap-4",
                      comment.authorId === 'tm-1' ? "flex-row-reverse" : ""
                    )}>
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                        {author?.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                      </div>
                      <div className={cn(
                        "max-w-[70%] space-y-1",
                        comment.authorId === 'tm-1' ? "items-end" : ""
                      )}>
                        <div className={cn(
                          "flex items-center gap-2 mb-1",
                          comment.authorId === 'tm-1' ? "flex-row-reverse" : ""
                        )}>
                          <span className="text-xs font-bold text-slate-900">{author?.name}</span>
                          <span className="text-[10px] text-slate-400">{comment.timestamp ? formatDistanceToNow(parseISO(comment.timestamp), { addSuffix: true }) : 'Unknown time'}</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-100 rounded text-[10px] font-bold text-slate-500">
                            {getTypeIcon(comment.type)}
                            {comment.type}
                          </div>
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl text-sm shadow-sm",
                          comment.authorId === 'tm-1' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none",
                          comment.isIssue && "border-l-4 border-l-rose-500"
                        )}>
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <form onSubmit={handleSendComment} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Select 
                    className="h-8 text-xs w-40"
                    value={newCommentType}
                    onChange={(e) => setNewCommentType(e.target.value as any)}
                  >
                    <option value="General Note">General Note</option>
                    <option value="Progress Update">Progress Update</option>
                    <option value="Client Feedback">Client Feedback</option>
                    <option value="Issue Reported">Issue Reported</option>
                    <option value="Resolution">Resolution</option>
                    <option value="Revision">Revision</option>
                    <option value="Important">Important</option>
                  </Select>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isIssue} 
                      onChange={(e) => setIsIssue(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Mark as Issue
                  </label>
                </div>
                <div className="flex gap-3">
                  <textarea 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Type your comment here..."
                    className="flex-1 rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                  />
                  <Button type="submit" className="h-20 w-20 flex-col gap-2">
                    <Send className="w-5 h-5" />
                    <span className="text-xs">Send</span>
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Select a project to view comments
          </div>
        )}
      </Card>
    </div>
  );
};
