describe('Detect button state changes', () => {
  it('captures changed buttons after an action', () => {
    const beforeStates = []
    const changedButtonIndices = []

    const readState = (btn) => {
      const s = window.getComputedStyle(btn)
      return {
        text: btn.innerText.trim(),
        backgroundImage: s.backgroundImage,
        color: s.color,
        boxShadow: s.boxShadow,
      }
    }

    const sameState = (a, b) =>
      a.text === b.text &&
      a.backgroundImage === b.backgroundImage &&
      a.color === b.color &&
      a.boxShadow === b.boxShadow

    const getHintAndFollowIt = () => {
      cy.get('button').then(($buttons) => {
        $buttons.each((index, btn) => {
          beforeStates.push({ index, ...readState(btn) })
        })
      })

      cy.wait(500)

      cy.contains('button', 'hint').click()
      cy.wait(500)

      cy.get('button').then(($afterButtons) => {
        $afterButtons.each((index, btn) => {
          const before = beforeStates[index]
          if (!before) return

          const after = readState(btn)
          if (!sameState(before, after) && !after.text.includes("hint")) {
            changedButtonIndices.push(index)
          }
        })

        cy.log(`Changed buttons: ${changedButtonIndices.length}`)
      })

      cy.then(() => {
        cy.wait(500)
        expect(changedButtonIndices.length).to.equal(3)
      })
      cy.then(() => {
        changedButtonIndices.forEach((buttonIndex) => {
          cy.get('button').eq(buttonIndex).click()
        })
        
        cy.contains('button', '=').click()
      })
    }

    cy.visit('https://numberz.uk')

    getHintAndFollowIt()

    cy.get('img').then(($img) => {
      expect($img.attr('src')).to.include('fireworks-city.jpg')
    })

  })
})