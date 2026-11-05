import React from 'react';
import { ArrowRight } from 'lucide-react';
import { StaffMember, MonthlyTask } from '../types/crm';
import { Avatar, Card, CardHeader, Progress } from './ui';

interface StaffWorkloadViewProps {
  staffList: StaffMember[];
  tasks: MonthlyTask[];
  onSelectStaff: (staffId: string) => void;
}

export const StaffWorkloadView: React.FC<StaffWorkloadViewProps> = ({ staffList, tasks, onSelectStaff }) => (
  <Card className="overflow-hidden">
    <CardHeader title="Team workload" description={`${staffList.length} members · October filings`} />
    <table className="data-table">
      <thead>
        <tr>
          <th className="min-w-[200px]">Member</th>
          <th className="text-right">Monthly tasks</th>
          <th className="text-right">Filed</th>
          <th className="text-right">Pending</th>
          <th className="w-[22%] min-w-[140px]">Completion</th>
          <th className="text-right">ITR returns</th>
          <th className="text-right" />
        </tr>
      </thead>
      <tbody>
        {staffList.map((staff) => {
          const staffTasks = tasks.filter((t) => t.assignedStaffId === staff.id);
          const filedCount = staffTasks.filter((t) => t.status === 'Filed').length;
          const pendingCount = staffTasks.length - filedCount;
          const pct = staffTasks.length ? Math.round((filedCount / staffTasks.length) * 100) : 0;

          return (
            <tr key={staff.id}>
              <td className="py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={staff.initials} size="sm" />
                  <div className="min-w-0">
                    <div className="font-medium text-fg">{staff.name}</div>
                    <div className="text-xs text-fg-subtle truncate">{staff.role}</div>
                  </div>
                </div>
              </td>
              <td className="num text-right text-fg">{staffTasks.length}</td>
              <td className="num text-right text-success">{filedCount}</td>
              <td className="num text-right text-fg-muted">{pendingCount}</td>
              <td>
                <div className="flex items-center gap-2.5">
                  <Progress value={pct} tone={pct === 100 ? 'success' : 'neutral'} />
                  <span className="num text-xs text-fg-subtle w-8 text-right">{pct}%</span>
                </div>
              </td>
              <td className="num text-right text-fg">{staff.assignedITRCount}</td>
              <td className="text-right">
                <button
                  onClick={() => onSelectStaff(staff.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors whitespace-nowrap"
                >
                  View tasks
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </Card>
);
