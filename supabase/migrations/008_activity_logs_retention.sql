-- Allow administrators to prune audit trail entries older than 6 months
DROP POLICY IF EXISTS activity_logs_admin_delete ON public.activity_logs;
CREATE POLICY activity_logs_admin_delete ON public.activity_logs
  FOR DELETE TO authenticated
  USING (public.is_admin());
