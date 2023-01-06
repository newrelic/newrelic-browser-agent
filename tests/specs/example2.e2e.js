describe('My Login application2', () => {
    it('should login with valid credentials', async () => {
        await browser.url(`https://the-internet.herokuapp.com/login`)

        await $('#username').setValue('tomsmith')
        await $('#password').setValue('SuperSecretPassword!')
        await $('button[type="submit"]').click()

        await expect($('#flash')).toBeExisting()
        await expect($('#flash')).toHaveTextContaining(
            'You logged into a secure area!')
    })
  it('should login with valid credentials2', async () => {
    await browser.url(`https://the-internet.herokuapp.com/login`)

    await $('#username').setValue('tomsmith')
    await $('#password').setValue('SuperSecretPassword!')
    await $('button[type="submit"]').click()

    await expect($('#flash')).toBeExisting()
    await expect($('#flash')).toHaveTextContaining(
      'You logged into a secure area!')
  })
})

