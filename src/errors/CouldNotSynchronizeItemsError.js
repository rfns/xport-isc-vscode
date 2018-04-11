module.exports = class CouldNotSynchronizeItemsError extends Error {
  constructor(items) {
    super(`Could not synchronize the following items:
      ${items.map(item =>
        `${item.name} (Reason: ${item.reason}.)`
      )}
    `);
    this.shortMessage = 'XPort: Could not synchronize all the requested items. Check your Output for more details';
    this.items = items;
  }
};
