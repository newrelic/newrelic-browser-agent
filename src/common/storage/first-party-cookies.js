export class FirstPartyCookies {
  constructor (domain) {
    this.domain = domain
  }
  get (name) {
    try {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      if (match) return match[2]
    } catch (err) {
      return ''
    }
  }
  set (key, value) {
    try {
      const cookie = `${key}=${value}; Domain=${domain}; Path=/`
      document.cookie = cookie
    } catch (err) {
      return
    }
  }
  remove (key) {
    try {
      return document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Domain=${domain}; Path=/`
    } catch (err) {
      return
    }
  }
}
