# Card 01 · TRN-01 · Register a taxpayer

**Story.** As a treasury clerk, I want to register a taxpayer with a mobile number, so that I can bill them later.

**Where on the screen.** Home › **Create my data** › section **1 — Create a taxpayer**: Full name, Mobile (09XXXXXXXXX), Email (optional), button **Create taxpayer**. Then top bar › **My data** › **My taxpayers**.

**API.** `POST /api/v1/training/taxpayers` (create) and `GET /api/v1/training/taxpayers/{taxpayer_id}` (see one).

## Acceptance criteria

```gherkin
Feature: Register a taxpayer

  Scenario: AC-1 Register a taxpayer
    Given I am on Training setup, section "1 — Create a taxpayer"
    When I type Full name "Ana Dela Cruz" and a new mobile "09xxxxxxxxx"
    And I click "Create taxpayer"
    Then I see "Ana Dela Cruz created — mobile 09xxxxxxxxx."
    And My data › My taxpayers shows a row: Ana Dela Cruz | 09xxxxxxxxx | —

  Scenario: AC-2 Spaces around the name are removed
    When I register the name "  Ana Dela Cruz  " (spaces before and after)
    Then the taxpayer is saved as "Ana Dela Cruz"

  Scenario: AC-3 A wrong mobile is refused
    When I type the mobile "0917123456" (10 digits, one too few)
    And I click "Create taxpayer"
    Then I see under Mobile: "must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX"
    And no taxpayer is made

  Scenario: AC-4 A wrong name is refused
    When I type the Full name "Ana 2" (a digit), or 101 letters (one too many)
    Then I see under Full name: "2-100 characters: letters, spaces, . - ' and Ñ only"
    But a name of exactly 100 letters is accepted

  Scenario: AC-5 The same mobile cannot be registered twice
    Given a taxpayer with the mobile "09xxxxxxxxx" already exists
    When I register another taxpayer with the same mobile
    Then I see "already registered for this tenant"

  Scenario: AC-6 Only I can see my taxpayer
    Given I registered a taxpayer
    When another user opens it
    Then they get "Not Found"
```

## The rules on the screen

| Field | Rule | Message when broken |
|---|---|---|
| Full name | 2 to 100 characters after the spaces at the start and end are removed. Only letters, spaces, `.` `-` `'` and Ñ/ñ | `2-100 characters: letters, spaces, . - ' and Ñ only` |
| Mobile (09XXXXXXXXX) | `09` + 9 digits, or `+639` + 9 digits | `must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX` |
| Mobile (09XXXXXXXXX) | One mobile per city | `already registered for this tenant` |
| Email (optional) | Blank, or one `@` and a dot after it | `invalid email format` |
