export let domain = ''

export default {
  get (name) {
    console.log('get ', name, 'from fpc')
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    console.log(match && match[2])
    if (match) return match[2]
  },
  set (key, value) {
    console.log('set ', key, value)
    const cookie = `${key}=${value}; Domain=${domain}; Path=/`
    document.cookie = cookie
  },
  remove (key) {
    try {
      return document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Domain=${domain}; Path=/`
    } catch (err) {
      return () => {}
    }
  },
  setDomain (d) {
    domain = d
  }
}
