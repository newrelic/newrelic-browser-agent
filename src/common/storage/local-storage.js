export default {
  get (key) {
    try {
      console.log('read from local storage...', key)
      return localStorage.getItem(key)
    } catch (err) {
      return () => {}
    }
  },
  set (key, value) {
    console.log('set in local storage...')
    try {
      if (!value) return localStorage.removeItem(key)
      return localStorage.setItem(key, value)
    } catch (err) {
      return () => {}
    }
  },
  remove (key) {
    try {
      return localStorage.removeItem(key, value)
    } catch (err) {
      return () => {}
    }
  }
}
