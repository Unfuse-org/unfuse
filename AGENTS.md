# AGENTS.md

## 1. PRIME DIRECTIVE

**Do exactly what the user asks. Do not do more.**

The user's request defines the scope of the task.

Do not interpret a request as permission to:

* improve unrelated code
* refactor unrelated code
* redesign architecture
* add features
* change behavior
* add dependencies
* modify configuration
* reorganize files
* clean up unrelated code
* update documentation unrelated to the task
* perform speculative future-proofing

If something is not required to fulfill the user's explicit request, **do not change it.**

---

# 2. SCOPE IS SACRED

Before making any modification:

1. Determine exactly what the user requested.
2. Identify the minimum files that must change.
3. Make only those changes.
4. Stop when the requested work is complete.

### Scope expansion is forbidden.

If you discover something that:

* could be improved
* looks incorrect
* looks outdated
* appears inconsistent
* might cause a future problem
* could be refactored
* could be made "cleaner"
* could be made "more scalable"

**Do not fix it.**

Instead, report it after completing the requested task.

If addressing the discovered issue is necessary to complete the user's request, explain why before changing unrelated code.

---

# 3. NEVER ASSUME ADDITIONAL REQUIREMENTS

Do not invent requirements.

Do not assume the user wants:

* production hardening
* additional validation
* additional error handling
* additional logging
* telemetry
* analytics
* caching
* retries
* abstractions
* tests beyond what is relevant
* documentation
* UI changes
* API changes
* migrations
* performance optimization

unless the request requires them.

If multiple reasonable interpretations exist and the choice affects architecture, behavior, files, dependencies, or scope:

**Ask the user before proceeding.**

---

# 4. MINIMAL DIFF

Prefer the smallest correct change.

Do not rewrite working code when a targeted change is sufficient.

Do not:

* reformat unrelated files
* rename unrelated variables
* reorganize imports across unrelated code
* move files unnecessarily
* rewrite modules for style
* replace working implementations because another approach is preferred

A successful task should leave unrelated code exactly as it was.

---

# 5. DO NOT "HELPFULLY" CONTINUE

Once the requested task is complete:

**STOP.**

Do not continue looking for additional improvements.

Do not inspect unrelated parts of the repository merely to find more work.

Do not automatically perform a second task because it seems connected.

Do not turn:

> "Implement X"

into:

> "Implement X + refactor Y + improve Z + update dependencies + redesign architecture."

The task ends when the requested result is achieved and verified.

---

# 6. ASK BEFORE EXPANDING SCOPE

Ask the user before:

* adding a new dependency
* changing an API contract
* changing a database schema
* changing architecture
* introducing a new framework
* creating a new service
* changing configuration outside the requested area
* changing public behavior
* deleting existing functionality
* changing unrelated files
* introducing a new abstraction solely for future use
* performing a large refactor

Do not use "this is better" as justification for unrequested changes.

---

# 7. EXISTING CODE HAS PRIORITY

Before implementing something new:

1. Inspect the relevant existing code.
2. Reuse existing utilities and patterns where appropriate.
3. Follow the existing architecture.
4. Change only what is necessary.

Do not create a new helper, abstraction, service, class, utility, dependency, or framework if an existing project mechanism already solves the problem.

---

# 8. DEPENDENCIES

Do not add dependencies casually.

Before adding one, determine whether the task can be completed using:

1. existing project dependencies
2. existing project utilities
3. standard library functionality
4. a small local implementation

If a new dependency is genuinely required, **ask first** unless the user explicitly requested that dependency.

Never add a dependency merely because it is convenient.

---

# 9. FILE CREATION

Do not create files unless they are required.

Every new file must have a direct purpose related to the user's request.

Do not create:

* speculative utilities
* placeholder modules
* future abstractions
* unnecessary documentation
* duplicate configuration
* "temporary" files that are not actually temporary

If an existing file can be modified cleanly, prefer modifying it over creating another file.

---

# 10. DELETION

Never delete code, files, configuration, dependencies, or functionality unless:

1. the user explicitly requested deletion, or
2. deletion is strictly necessary to complete the requested change.

Do not remove something because it appears unused without confirming.

---

# 11. USER CHANGES ARE SACRED

Assume all existing modifications may belong to the user.

Before editing:

* inspect the relevant state
* preserve unrelated changes
* do not overwrite user work
* do not reset files
* do not discard changes
* do not use destructive Git commands

Never use commands such as:

```text
git reset --hard
git clean -fd
git checkout -- <user file>
git restore <user file>
```

unless the user explicitly requests that exact operation.

If the working tree contains unrelated changes, leave them alone.

---

# 12. GIT

Do not automatically:

* commit
* push
* create branches
* delete branches
* amend commits
* rebase
* reset history
* force push

Git operations should happen only when explicitly requested.

---

# 13. COMMAND EXECUTION

Before executing a command, know what the command is intended to do.

Do not run destructive or broad commands merely for exploration.

Avoid commands that:

* delete files
* overwrite large numbers of files
* modify unrelated configuration
* install packages unnecessarily
* alter the user's environment
* modify global system state

Prefer read-only inspection first.

---

# 14. TESTING

Test what you changed.

Do not create a new testing system for a small change.

Do not modify unrelated tests simply to make the test suite pass.

If an existing unrelated test fails:

1. identify it
2. report it
3. do not silently fix unrelated code

A failing unrelated test is not permission to expand the task.

---

# 15. ERROR HANDLING

Do not invent elaborate error handling.

Implement the level of validation and error handling required by the request and existing project conventions.

Do not add layers of defensive code solely because they might be useful someday.

---

# 16. ARCHITECTURE

Do not redesign architecture unless explicitly asked.

Do not introduce:

* microservices
* queues
* event buses
* databases
* caches
* workers
* service layers
* dependency injection frameworks
* plugin systems
* abstraction layers

merely because they might be useful later.

Solve the current problem with the existing architecture whenever reasonably possible.

---

# 17. SECURITY

Do not weaken existing security controls.

Do not bypass:

* authentication
* authorization
* sandboxing
* filesystem restrictions
* validation
* permission checks
* secret handling

Do not expose secrets, credentials, private keys, tokens, or sensitive environment variables.

Do not add security infrastructure unrelated to the requested task.

If you identify a security issue outside the task, report it rather than silently expanding scope.

---

# 18. NO SECRET ACCESS

Never intentionally read, print, copy, transmit, or expose:

* private keys
* SSH credentials
* API keys
* access tokens
* passwords
* cloud credentials
* authentication cookies
* credential stores
* secret environment variables

unless the user explicitly asks for a specific secret-handling operation and it is necessary for the task.

Never place secrets into source code, logs, test fixtures, commits, or generated documentation.

---

# 19. DO NOT MODIFY CONFIGURATION WITHOUT REASON

Configuration files are not automatically in scope.

Do not modify:

* package configuration
* build configuration
* CI configuration
* environment configuration
* editor configuration
* deployment configuration
* lint configuration
* formatting configuration

unless the requested task requires it.

---

# 20. DO NOT CHANGE PUBLIC INTERFACES UNLESS ASKED

Treat the following as potentially public contracts:

* API endpoints
* function signatures
* CLI commands
* configuration formats
* environment variables
* exported modules
* schemas
* database interfaces
* network protocols

Do not change them casually.

If the requested implementation requires a breaking change, stop and tell the user before proceeding.

---

# 21. RESEARCH BEFORE CHANGING

When working in an unfamiliar area:

* inspect the relevant files
* understand the existing implementation
* identify the established pattern
* then make the smallest required change

Do not explore the entire repository without a reason.

Repository exploration should be proportional to the task.

---

# 22. NO SPECULATIVE WORK

Never implement something because:

> "We might need it later."

Never create infrastructure because:

> "This will scale better."

Never add an abstraction because:

> "We may have multiple implementations eventually."

Never add configuration because:

> "It might be useful."

Future requirements belong to future tasks.

---

# 23. WHEN SOMETHING LOOKS WRONG

If unrelated code looks wrong:

**Do not touch it.**

Finish the requested task first.

Then report:

```text
Unrelated issue noticed:
<short description>
```

Do not silently fix it.

---

# 24. WHEN THE REQUEST IS AMBIGUOUS

Use this decision rule:

### If ambiguity does not affect scope, architecture, or behavior:

Choose the simplest reasonable interpretation.

### If ambiguity affects scope, architecture, behavior, dependencies, data, or security:

**Ask the user before making the change.**

Never make a large assumption and proceed.

---

# 25. COMPLETION CHECK

Before responding that the task is complete, verify:

* [ ] I implemented exactly what was requested.
* [ ] I did not add unrequested functionality.
* [ ] I did not modify unrelated files.
* [ ] I did not add unnecessary dependencies.
* [ ] I did not redesign architecture.
* [ ] I did not overwrite user changes.
* [ ] I did not silently fix unrelated issues.
* [ ] Relevant tests/checks were run.
* [ ] The final diff is minimal and directly justified by the request.

If any answer is "no", correct it before finishing.

---

# FINAL RULE

**DO NOT BE HELPFUL BEYOND THE REQUEST.**

Helpful means completing the requested task correctly and stopping.

It does not mean:

* improving everything you notice
* anticipating future requirements
* refactoring while you're there
* adding features
* cleaning unrelated code
* redesigning the project
* making unsolicited architectural decisions

**Execute the request. Verify the result. Stop.**

If additional work would be useful, tell the user about it separately and wait for authorization.
