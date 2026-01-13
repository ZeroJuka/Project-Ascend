I will refactor the Goal creation process to be a single-page form and fix the crash issue.

1. **Refactor** **`GoalManager.tsx`**:

   * Remove the multi-step wizard logic (`step` state) and consolidate all inputs (Title, Description, Type, Time, Categories, Amount) into a single scrollable form.

   * Add a new Goal Type option: **"Spend at least"** (mapped to `spend``more`_) and "Spend Less" (mapped to spend\_less_),  replacing the existing "Spend less than" (`spend_less`) and "Save Money" (`save`) categories.

   * Update the "Create Goal" button to validate all fields at once.

2. **Fix** **`toFixed`** **Crash in** **`GoalsScreen.tsx`**:

   * Modify the `onGoalCreated` callback. When a new goal is created, I will explicitly inject a `progress: 0` property into the new goal object before adding it to the state. This prevents the `undefined` error when the app tries to render the progress bar for the newly created item.

3. **Visual Improvements**:

   * Ensure the new single-page layout is clean and user-friendly, using sections for clarity.

