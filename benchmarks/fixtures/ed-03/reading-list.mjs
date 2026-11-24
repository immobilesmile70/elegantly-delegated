export class ReadingList {
  #titles = [];

  list() {
    return [...this.#titles];
  }

  add(title) {
    if (typeof title !== 'string' || !title.trim()) throw new TypeError('A title is required.');
    const normalized = title.trim();
    if (this.#titles.includes(normalized)) return false;
    this.#titles.push(normalized);
    return true;
  }

  remove(title) {
    const index = this.#titles.indexOf(title);
    if (index < 0) return false;
    this.#titles.splice(index, 1);
    return true;
  }
}
