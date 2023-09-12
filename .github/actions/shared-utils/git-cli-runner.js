import process from 'process'
import child_process from 'child_process'

export class GitCliRunner {
  #dir
  #login
  #githubToken
  #userName
  #userEmail

  constructor (dir, login, githubToken, userName, userEmail) {
    this.#dir = dir
    this.#login = login
    this.#githubToken = githubToken
    this.#userName = userName
    this.#userEmail = userEmail
  }

  async clone(owner, repo) {
    console.log(`Cloning ${owner}/${repo} into ${this.#dir}`)
    await this.#runCommand(
      'clone',
      [
        '--depth=1',
        `https://${this.#login}:${this.#githubToken}@github.com/${owner}/${repo}.git`,
        '.'
      ]
    )
    await this.setUser()
  }

  async setUser() {
    await this.#runCommand(
      'config',
      [
        'user.name',
        this.#userName
      ]
    )
    await this.#runCommand(
      'config',
      [
        'user.email',
        this.#userEmail
      ]
    )
  }

  async checkoutBranch(branchName, force) {
    if (force) {
      await this.#runCommand(
        'reset',
        [
          '--hard'
        ]
      )
    }
    await this.#runCommand(
      'checkout',
      [
        branchName
      ]
    )
  }

  async createBranch(branchName) {
    await this.#runCommand(
      'checkout',
      [
        '-b',
        branchName
      ]
    )
  }

  async deleteLocalBranch(branchName) {
    await this.#runCommand(
      'branch',
      [
        '-D',
        branchName
      ]
    )
  }

  async commitFile(file, commitMessage, force) {
    await this.#runCommand(
      'add',
      [
        file
      ]
    )
    await this.#runCommand(
      'commit',
      [
        '-m',
        commitMessage,
        ...(force ? ['--no-verify'] : [])
      ]
    )
  }

  async commitFiles(files, commitMessage, force) {
    await this.#runCommand(
      'add',
      files
    )
    await this.#runCommand(
      'commit',
      [
        '-m',
        commitMessage,
        ...(force ? ['--no-verify'] : [])
      ]
    )
  }

  async push(branchName, force) {
    await this.#runCommand(
      'push',
      [
        '--set-upstream',
        'origin',
        branchName,
        ...(force ? ['--force'] : [])
      ]
    )
  }

  #runCommand (command, parameters = []) {
    return new Promise((resolve, reject) => {
      const proc = child_process.spawn(
        'git',
        [command, ...parameters],
        {
          stdio: 'inherit',
          cwd: this.#dir,
          env: {
            ...process.env,
            GH_TOKEN: this.#githubToken
          }
        }
      )

      proc.on('close', (code) => {
        if (code !== 0) {
          reject()
        } else {
          resolve()
        }
      })
    })
  }
}
