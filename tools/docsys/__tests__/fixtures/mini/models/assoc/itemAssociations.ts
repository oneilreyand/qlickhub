import { ItemModel } from '../item.js';
import { TagModel } from '../tag.js';

export function setupItemAssociations() {
  ItemModel.hasMany(TagModel, { as: 'tags', foreignKey: 'itemId' });
  TagModel.belongsTo(ItemModel, { as: 'item', foreignKey: 'itemId' });
}
