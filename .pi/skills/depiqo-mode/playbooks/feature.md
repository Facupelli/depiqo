# Feature

1. Understand the requested behavior.
   Identify requirements, constraints and success criteria.

2. Investigate the affected subsystem.
   Use `how` to understand the current implementation,
   its boundaries, dependencies and invariants.

3. Design the change.
   Evaluate whether the existing design accommodates the new requirements.
   Apply relevant engineering principles.
   Choose the design before writing implementation code.

4. Implement the change.
   Work in small, independently verifiable units.
   Separate behavior-preserving refactoring from changes to behavior when necessary.

5. Review the implementation.
   Check the diff against the chosen design,
   requirements and existing invariants.
   Look for unnecessary complexity and regressions.

6. Verify the result.
   Execute relevant checks and tests.
   Verify the requested behavior on the appropriate surface.
   Do not treat incomplete verification as success.
