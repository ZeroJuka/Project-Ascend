-- Fix invalid Ionicons names in categories
UPDATE categories SET icon = 'restaurant' WHERE icon = 'utensils';
UPDATE categories SET icon = 'cart' WHERE icon = 'shopping-bag';
UPDATE categories SET icon = 'game-controller' WHERE icon = 'gamepad';
UPDATE categories SET icon = 'bulb' WHERE icon = 'lightbulb';
UPDATE categories SET icon = 'airplane' WHERE icon = 'plane';
UPDATE categories SET icon = 'cash' WHERE icon = 'dollar-sign';
UPDATE categories SET icon = 'ellipsis-horizontal' WHERE icon = 'more-horizontal';

-- Create junction table for category-goal relationships
CREATE TABLE goal_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(goal_id, category_id)
);

-- Add RLS policies for goal_categories
ALTER TABLE goal_categories ENABLE ROW LEVEL SECURITY;

-- Policy for reading goal categories
CREATE POLICY "Users can view goal categories for their own goals" ON goal_categories
    FOR SELECT USING (
        goal_id IN (
            SELECT id FROM goals WHERE user_id = auth.uid()
        )
    );

-- Policy for inserting goal categories
CREATE POLICY "Users can create goal categories for their own goals" ON goal_categories
    FOR INSERT WITH CHECK (
        goal_id IN (
            SELECT id FROM goals WHERE user_id = auth.uid()
        )
    );

-- Policy for deleting goal categories
CREATE POLICY "Users can delete goal categories for their own goals" ON goal_categories
    FOR DELETE USING (
        goal_id IN (
            SELECT id FROM goals WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT ON goal_categories TO anon;
GRANT SELECT, INSERT, DELETE ON goal_categories TO authenticated;

-- Add monthly_budget field to goals table
ALTER TABLE goals 
ADD COLUMN monthly_budget DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN budget_reset_day INTEGER DEFAULT 1 CHECK (budget_reset_day BETWEEN 1 AND 31);