export interface TaskItem {
  id: string;
  title: string;
  folder: string;
  folderId?: string | null;
  owner: string;
  ownerAvatar: string;
  linkedReqsCount: number;
  reqTitle: string;
  qaState: 'Passed' | 'In Review' | 'Blocked' | 'Draft';
  priority: 'High' | 'Medium' | 'Low';
  updatedAt: string;
}
