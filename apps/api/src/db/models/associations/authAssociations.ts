import { UserModel } from '../user.js';
import { AuthSessionModel } from '../authSession.js';
import { UserFcmTokenModel } from '../userFcmToken.js';

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
}
