import { Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { UserModel } from '../../db/models/user.js';

export class UserService {
  /**
   * Retains the opaque user ID required by audit foreign keys while removing
   * personal and authentication data. The paranoid delete prevents future
   * default-scope reads from treating the account as active.
   */
  public static async anonymizeAndDeactivate(userId: string): Promise<void> {
    await sequelize.transaction(async (transaction: Transaction) => {
      const user = await UserModel.findByPk(userId, { transaction });
      if (!user) throw new Error('User not found or already deactivated');

      await user.update(
        {
          email: `deleted+${user.id}@invalid.local`,
          name: 'Deleted user',
          avatarUrl: null,
          passwordHash: null,
          role: 'viewer',
        },
        { transaction }
      );
      await user.destroy({ transaction });
    });
  }
}
