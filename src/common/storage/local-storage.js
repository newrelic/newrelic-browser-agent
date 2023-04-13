export default {
  get (key) {
    try {
      return localStorage.getItem(key)
    } catch (err) {
      return () => {}
    }
  },
  set (key, value) {
    try {
      if (!value) return localStorage.removeItem(key)
      return localStorage.setItem(key, value)
    } catch (err) {
      return () => {}
    }
  },
  remove (key) {
    try {
      return localStorage.removeItem(key)
    } catch (err) {
      return () => {}
    }
  }
}
