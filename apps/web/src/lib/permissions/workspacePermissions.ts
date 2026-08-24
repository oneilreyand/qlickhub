const workspaceCreationRoles = ['owner', 'admin', 'po'] as const;

export function canCreateWorkspace(role: string | null | undefined): boolean {
  const normalizedRole = role?.toLowerCase();
  return workspaceCreationRoles.some((allowedRole) => allowedRole === normalizedRole);
}
