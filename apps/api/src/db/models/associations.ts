import {
  setupAuthAssociations,
  setupWorkspaceAssociations,
  setupTaskAssociations,
  setupQaAssociations,
  setupReleaseAssociations,
  setupNotificationAssociations,
} from './associations/index.js';

export function setupAssociations() {
  setupAuthAssociations();
  setupWorkspaceAssociations();
  setupTaskAssociations();
  setupQaAssociations();
  setupReleaseAssociations();
  setupNotificationAssociations();
}

setupAssociations();
