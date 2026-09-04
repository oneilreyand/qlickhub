import { UserModel } from '../user.js';
import { AuthSessionModel } from '../authSession.js';
import { UserFcmTokenModel } from '../userFcmToken.js';
import { AuthSecurityEventModel } from '../authSecurityEvent.js';

export function setupAuthAssociations() {
  UserModel.hasMany(UserFcmTokenModel, {
    foreignKey: 'userId',
    as: 'fcmTokens',
    onDelete: 'CASCADE',
  });
  UserFcmTokenModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(AuthSessionModel, {
    foreignKey: 'userId',
    as: 'authSessions',
    onDelete: 'CASCADE',
  });
  AuthSessionModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(AuthSecurityEventModel, {
    foreignKey: 'actorId',
    as: 'authoredSecurityEvents',
    onDelete: 'RESTRICT',
  });
  AuthSecurityEventModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'RESTRICT',
  });
  UserModel.hasMany(AuthSecurityEventModel, {
    foreignKey: 'subjectUserId',
    as: 'subjectSecurityEvents',
    onDelete: 'RESTRICT',
  });
  AuthSecurityEventModel.belongsTo(UserModel, {
    foreignKey: 'subjectUserId',
    as: 'subjectUser',
    onDelete: 'RESTRICT',
  });
}
