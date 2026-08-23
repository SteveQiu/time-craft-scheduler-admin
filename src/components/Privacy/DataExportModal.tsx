import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileJson, FileText, CheckCircle2 } from 'lucide-react';

interface DataExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'json' | 'csv';
type ExportScope = 'all' | 'appointments' | 'profile';

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  download_url?: string;
  created_at: string;
}

export function DataExportModal({ open, onOpenChange }: DataExportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'ready'>('select');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [scope, setScope] = useState<ExportScope>('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [progress, setProgress] = useState(0);

  const resetModal = () => {
    setStep('select');
    setFormat('json');
    setScope('all');
    setIncludeDeleted(false);
    setExportJob(null);
    setProgress(0);
  };

  const requestExport = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: {
          format,
          scope,
          include_deleted: includeDeleted,
        },
      });

      if (error) throw error;
      return data as ExportJob;
    },
    onSuccess: (data) => {
      setExportJob(data);
      setStep('processing');
      pollExportStatus(data.id);
    },
    onError: (error: Error) => {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to start export',
        variant: 'destructive',
      });
    },
  });

  const pollExportStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('export_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        const job = data as ExportJob;
        setExportJob(job);

        if (job.status === 'processing') {
          setProgress((prev) => Math.min(prev + 10, 90));
        } else if (job.status === 'ready') {
          setProgress(100);
          setStep('ready');
          clearInterval(interval);
        } else if (job.status === 'failed') {
          clearInterval(interval);
          toast({
            title: 'Export Failed',
            description: 'The export job failed. Please try again.',
            variant: 'destructive',
          });
          setStep('select');
        }
      } catch (error) {
        console.error('Failed to poll export status:', error);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const handleDownload = () => {
    if (exportJob?.download_url) {
      window.open(exportJob.download_url, '_blank');
      toast({
        title: 'Download Started',
        description: 'Your data export is being downloaded.',
      });
      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 1000);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetModal();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Your Data</DialogTitle>
          <DialogDescription>
            Download a copy of your personal data
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Export Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="json" id="format-json" />
                  <Label htmlFor="format-json" className="flex-1 cursor-pointer flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-muted-foreground">Machine-readable format</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="csv" id="format-csv" />
                  <Label htmlFor="format-csv" className="flex-1 cursor-pointer flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-muted-foreground">Spreadsheet-compatible format</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Data Scope</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as ExportScope)}>
                <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="flex-1 cursor-pointer">
                    <div className="font-medium">All Data</div>
                    <div className="text-xs text-muted-foreground">Profile, appointments, settings</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="appointments" id="scope-appointments" />
                  <Label htmlFor="scope-appointments" className="flex-1 cursor-pointer">
                    <div className="font-medium">Appointments Only</div>
                    <div className="text-xs text-muted-foreground">Bookings and schedules</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="profile" id="scope-profile" />
                  <Label htmlFor="scope-profile" className="flex-1 cursor-pointer">
                    <div className="font-medium">Profile Only</div>
                    <div className="text-xs text-muted-foreground">Personal information</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-deleted"
                checked={includeDeleted}
                onCheckedChange={(checked) => setIncludeDeleted(checked as boolean)}
              />
              <Label htmlFor="include-deleted" className="cursor-pointer">
                Include deleted items
              </Label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => setStep('confirm')} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Format:</span>
                <Badge variant="outline">{format.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Scope:</span>
                <Badge variant="outline">{scope === 'all' ? 'All Data' : scope}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Deleted items:</span>
                <Badge variant="outline">{includeDeleted ? 'Included' : 'Excluded'}</Badge>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Your export will include:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {scope === 'all' && (
                  <>
                    <li>Profile information</li>
                    <li>Appointment history</li>
                    <li>Settings and preferences</li>
                  </>
                )}
                {scope === 'appointments' && <li>All appointment records</li>}
                {scope === 'profile' && <li>Personal information and settings</li>}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => requestExport.mutate()}
                disabled={requestExport.isPending}
                className="flex-1"
              >
                {requestExport.isPending ? 'Starting…' : 'Start Export'}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">Preparing your export…</div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                This may take a few moments. Please don't close this window.
              </p>
            </div>
          </div>
        )}

        {step === 'ready' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <div className="font-medium">Export Ready!</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Your data is ready to download
                </div>
              </div>
            </div>

            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Download Now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
