import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ReportDialog } from './ReportDialog';
import { Star, Flag, Trash2 } from 'lucide-react';

interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  appointment_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_name?: string | null;
}

interface ReviewSectionProps {
  profileId: string;
  profileName: string;
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`h-5 w-5 ${star <= value ? 'text-warning fill-current' : 'text-muted-foreground'}`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ profileId, profileName }: ReviewSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [reportReviewId, setReportReviewId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewed_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch reviewer names
      const reviewerIds = [...new Set((data || []).map((r: any) => r.reviewer_id))];
      if (reviewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', reviewerIds);
        const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
        return (data || []).map((r: any) => ({
          ...r,
          reviewer_name: nameMap.get(r.reviewer_id) || 'Anonymous',
        })) as Review[];
      }
      return (data || []) as Review[];
    },
    enabled: !!profileId,
  });

  // Check if user has completed appointments with this profile (to allow review)
  const { data: canReview } = useQuery({
    queryKey: ['can-review', user?.id, profileId],
    queryFn: async () => {
      if (!user || user.id === profileId) return false;
      // Check for completed appointments between users
      const { data } = await supabase
        .from('appointments')
        .select('id')
        .eq('status', 'completed')
        .or(`user_id.eq.${user.id},provider_id.eq.${user.id}`)
        .limit(1);
      return (data?.length || 0) > 0;
    },
    enabled: !!user && user.id !== profileId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewed_id: profileId,
        rating: newRating,
        review_text: newText || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', profileId] });
      queryClient.invalidateQueries({ queryKey: ['avg-rating', profileId] });
      setNewText('');
      setNewRating(5);
      setShowForm(false);
      toast({ title: 'Review submitted!' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', profileId] });
      queryClient.invalidateQueries({ queryKey: ['avg-rating', profileId] });
      toast({ title: 'Review deleted' });
    },
  });

  return (
    <>
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Reviews ({reviews.length})</CardTitle>
            {canReview && !showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                Write a Review
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Review Form */}
          {showForm && (
            <Card className="border border-border">
              <CardContent className="pt-4 space-y-3">
                <StarRating value={newRating} onChange={setNewRating} />
                <Textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder={`Write your review for ${profileName}...`}
                  rows={3}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews List */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="flex items-start space-x-3 py-3 border-b border-border last:border-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {(review.reviewer_name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground">
                        {review.reviewer_name || 'Anonymous'}
                      </span>
                      <StarRating value={review.rating} readonly />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                      {user && user.id !== review.reviewer_id && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReportReviewId(review.id)}>
                          <Flag className="h-3 w-3" />
                        </Button>
                      )}
                      {user && user.id === review.reviewer_id && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteReview.mutate(review.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Report Review Dialog */}
      <ReportDialog
        open={!!reportReviewId}
        onOpenChange={(open) => !open && setReportReviewId(null)}
        reportedReviewId={reportReviewId || undefined}
      />
    </>
  );
}
