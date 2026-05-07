export interface WorkerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  rating: number;
  availability: string[];
  hourlyRate: number;
}

export const workers: WorkerData[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@pikappoint.com',
    phone: '+1 (555) 123-4567',
    skills: ['Hair Cut', 'Hair Color', 'Styling'],
    rating: 4.9,
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    hourlyRate: 65,
  },
  {
    id: '2',
    name: 'Mike Wilson',
    email: 'mike@pikappoint.com',
    phone: '+1 (555) 234-5678',
    skills: ['Deep Tissue Massage', 'Swedish Massage', 'Sports Massage'],
    rating: 4.8,
    availability: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    hourlyRate: 80,
  },
  {
    id: '3',
    name: 'Lisa Chen',
    email: 'lisa@pikappoint.com',
    phone: '+1 (555) 345-6789',
    skills: ['Business Consultation', 'Strategy Planning', 'Market Analysis'],
    rating: 4.9,
    availability: ['Mon', 'Wed', 'Fri'],
    hourlyRate: 120,
  },
  {
    id: '4',
    name: 'David Rodriguez',
    email: 'david@pikappoint.com',
    phone: '+1 (555) 456-7890',
    skills: ['Personal Training', 'Nutrition Coaching', 'Weight Loss'],
    rating: 4.7,
    availability: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat', 'Sun'],
    hourlyRate: 55,
  },
];

export const getWorkerByName = (name: string) => workers.find(w => w.name === name);
export const getWorkerRate = (name: string): number => getWorkerByName(name)?.hourlyRate ?? 0;
export const getWorkerSkills = (name: string): string[] => getWorkerByName(name)?.skills ?? [];
