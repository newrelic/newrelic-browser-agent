export class LocalStorage {
  get (key) {
    try {
      // localStorage strangely type-casts non-existing data to "null"...
      // Cast it back to undefined if it doesnt exist
      return localStorage.getItem(key) || undefined
    } catch (err) {
      return ''
    }
  }
  set (key, value) {
    try {
      if (value === undefined || value === null) return this.remove(key)
      return localStorage.setItem(key, value)
    } catch (err) {
      return
    }
  }
  remove (key) {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      return
    }
  }
}
