import React from 'react';
import { StaffMember, MonthlyTask } from '../types/crm';
import { ArrowRight } from 'lucide-react';

interface StaffWorkloadViewProps {
  staffList: StaffMember[];
  tasks: MonthlyTask[];
  onSelectStaff: (staffId: string) => void;
}

export const StaffWorkloadView: React.FC<StaffWorkloadViewProps> = ({
  staffList,
  tasks,
  onSelectStaff,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-2">
        <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
          Audit Staff Allocation
        </h3>
        <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular">
          5 executive accounts active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((staff, idx) => {
          const staffTasks = tasks.filter((t) => t.assignedStaffId === staff.id);
          const filedCount = staffTasks.filter((t) => t.status === 'Filed').length;
          const pendingCount = staffTasks.length - filedCount;

          return (
            <div
              key={staff.id}
              className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] font-medium text-[11px] flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {staff.initials}
                    </span>
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] leading-tight">{staff.name}</h4>
                      <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">{staff.role}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-tabular text-[#86868B]">
                    #{idx + 1}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="p-2.5 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">
                      Monthly Tasks
                    </span>
                    <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5 block font-tabular">
                      {staffTasks.length}
                    </span>
                    <span className="text-[11px] text-[#34C759] font-medium block mt-0.5 font-tabular">
                      {filedCount} filed • {pendingCount} pending
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">
                      Annual Returns
                    </span>
                    <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5 block font-tabular">
                      {staff.assignedITRCount}
                    </span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block mt-0.5">
                      AY 2026-27
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectStaff(staff.id)}
                className="w-full py-1.5 px-3 bg-[#F2F2F7] dark:bg-[#242426] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-[6px] text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Filter tasks for {staff.name.split(' ')[0]}</span>
                <ArrowRight className="w-3 h-3 stroke-[1.5]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
