export default function () {
  setTimeout(() => { window.agent1.noticeError(new Error('test error')) }, 1000)
}
