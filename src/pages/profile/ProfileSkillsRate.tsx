import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wrench, DollarSign, Plus, Trash2 } from 'lucide-react';
import type { ProfileData, FormState } from './types';

interface ProfileSkillsRateProps {
  profile: ProfileData;
  editing: boolean;
  isOwnProfile: boolean;
  form: FormState;
  onFormChange: (form: FormState) => void;
  skillInput: string;
  onSkillInputChange: (value: string) => void;
}

export function ProfileSkillsRate({
  profile,
  editing,
  isOwnProfile,
  form,
  onFormChange,
  skillInput,
  onSkillInputChange,
}: ProfileSkillsRateProps) {
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      onFormChange({ ...form, skills: [...form.skills, trimmed] });
      onSkillInputChange('');
    }
  };

  const removeSkill = (skill: string) => {
    onFormChange({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  if (editing) {
    return (
      <>
        <div className="space-y-3">
          <Label>Skills</Label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => onSkillInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill (press Enter or click +)"
              />
              <Button type="button" size="sm" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {form.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between bg-secondary p-3 rounded-md"
                >
                  <span className="text-sm font-medium">{skill}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove skill: ${skill}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {form.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills added yet</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Hourly Rate ($)</Label>
          <Input
            type="number"
            min={0}
            value={form.hourly_rate}
            onChange={(e) =>
              onFormChange({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>
      </>
    );
  }

  return (
    <>
      {profile.skills && profile.skills.length > 0 ? (
        <div className="flex items-start space-x-2">
          <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      ) : isOwnProfile ? (
        <p className="text-sm text-muted-foreground">
          No skills set. Click &quot;Edit&quot; to add your skills.
        </p>
      ) : null}
      {profile.hourly_rate > 0 && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>${profile.hourly_rate}/hour</span>
        </div>
      )}
      {(!profile.hourly_rate || profile.hourly_rate === 0) && isOwnProfile && (
        <p className="text-sm text-muted-foreground">
          No hourly rate set. Click &quot;Edit&quot; to set your rate.
        </p>
      )}
    </>
  );
}
