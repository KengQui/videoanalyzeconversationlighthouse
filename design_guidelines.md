# Design Guidelines: Agent Eval Framework Explorer

## Design Approach
**Selected Approach**: Design System + Industry Reference  
**Primary References**: Linear (clean technical UI), Notion (data organization), ChatGPT (chat interface patterns)  
**System Foundation**: Material Design principles for data-heavy applications  
**Rationale**: This is a utility-focused, information-dense application where clarity, efficiency, and technical professionalism are paramount.

## Core Design Principles
1. **Technical Clarity**: Present complex framework data in digestible, scannable formats
2. **Split-Focus Efficiency**: Dual-panel layout that balances content exploration and AI assistance
3. **Data-First Design**: Tables and content take visual priority over decorative elements
4. **Conversational Support**: Chatbot feels helpful and unobtrusive, not dominant

## Color Palette

**Light Mode**:
- Primary: 220 70% 50% (professional blue)
- Background: 0 0% 100% (pure white)
- Surface: 220 20% 97% (subtle gray)
- Border: 220 15% 90%
- Text Primary: 220 20% 15%
- Text Secondary: 220 10% 45%

**Dark Mode**:
- Primary: 220 80% 60%
- Background: 220 20% 8%
- Surface: 220 18% 12%
- Border: 220 15% 20%
- Text Primary: 220 15% 95%
- Text Secondary: 220 10% 65%

**Semantic Colors**:
- Success: 142 70% 45% (data upload success)
- Warning: 38 90% 50% (validation warnings)
- Error: 0 70% 50% (upload/chat errors)
- AI Accent: 270 60% 55% (subtle purple for AI responses)

## Typography

**Font Stack**:
- Primary: 'Inter', system-ui, -apple-system, sans-serif
- Monospace: 'JetBrains Mono', 'Courier New', monospace (for data cells, code)

**Type Scale**:
- Heading 1: text-3xl font-bold (page titles)
- Heading 2: text-2xl font-semibold (section headers)
- Heading 3: text-xl font-semibold (card titles)
- Body Large: text-base font-normal (primary content)
- Body: text-sm font-normal (table data, chat messages)
- Small: text-xs font-normal (metadata, timestamps)
- Mono: font-mono text-sm (data values, technical content)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24  
**Common Patterns**:
- Component padding: p-4, p-6 (cards, panels)
- Section spacing: space-y-6, space-y-8
- Inline spacing: gap-2, gap-4

**Grid Structure**:
- Main Layout: Two-panel split (65% content / 35% chatbot on desktop)
- Mobile: Stack to single column, chatbot becomes bottom sheet
- Container: max-w-screen-2xl mx-auto px-4
- Table container: Horizontal scroll with sticky headers

## Component Library

### Primary Navigation
- Top navbar: Logo left, upload/export actions center, user menu right
- Height: h-16, border-b with subtle shadow
- Sticky positioning for persistent access

### Data Table Component
- Clean borders with hover states on rows
- Sortable column headers with icons
- Fixed header on scroll
- Alternating row backgrounds for scannability
- Cell padding: px-4 py-3
- Pagination controls at bottom
- Inline edit capabilities for content management

### File Upload Zone
- Large drag-and-drop area with dashed border
- Clear icon (upload cloud) and instructional text
- Shows file preview/validation after drop
- Progress indicator during upload
- Supports .xlsx, .csv formats

### AI Chatbot Panel
- Fixed right sidebar (desktop) or bottom drawer (mobile)
- Height: Full viewport minus header
- Chat message bubbles:
  - User messages: right-aligned, primary color background
  - AI responses: left-aligned, surface background with AI accent border-left
  - Timestamp: Small, secondary text below each message
- Input area: Fixed bottom with send button, autofocus
- Typing indicator: Animated dots when AI is processing
- Context badge: Shows which framework content is being referenced

### Content Cards
- White/surface background with border
- Rounded corners: rounded-lg
- Shadow: shadow-sm, hover:shadow-md transition
- Internal padding: p-6
- Used for dashboard statistics, framework overview

### Action Buttons
- Primary: Solid primary color, white text, rounded-md, px-4 py-2
- Secondary: Border with primary color, transparent background
- Ghost: No border, hover background only
- Icon buttons: Square, p-2, hover state

### Form Elements
- Input fields: border-2, focus:ring-2, rounded-md, px-3 py-2
- Select dropdowns: Consistent with inputs
- Checkboxes/radio: Accent color when checked
- Labels: text-sm font-medium, mb-2

### Search & Filter Bar
- Positioned above data table
- Input field with search icon
- Filter dropdowns for columns
- Clear filters button
- Compact height: h-12

## Interaction Patterns

### Data Table Interactions
- Click column headers to sort (ascending/descending toggle)
- Hover row to show edit/action icons
- Click cell to edit in-place (content management mode)
- Multi-select rows with checkboxes for batch operations

### Chat Interactions
- Auto-scroll to latest message
- Click suggested questions (if framework has FAQs)
- Copy button on AI responses
- Regenerate response option
- Context highlighting: When AI references specific data, highlight in table

### File Upload Flow
1. Drop file → Validation → Preview parsed data
2. Confirm import → Progress indicator → Success message
3. Table updates with new data → Auto-save

## Responsive Behavior

**Desktop (lg: 1024px+)**:
- Side-by-side panels for content and chat
- Full table width with horizontal scroll if needed
- All filters visible inline

**Tablet (md: 768px)**:
- Reduce chat panel to 40% width or toggle drawer
- Simplified table columns (hide non-essential)
- Stack some dashboard cards

**Mobile (sm: < 768px)**:
- Single column layout
- Chat becomes bottom sheet/modal
- Table: Horizontal scroll with fixed first column
- Upload: Full-width drop zone
- Collapsible filters

## Visual Enhancements

**Micro-interactions**:
- Button hover: Subtle scale (scale-[1.02]) and brightness change
- Table row hover: Background color shift
- Chat message: Fade-in animation on new messages
- Upload success: Checkmark animation

**Loading States**:
- Skeleton screens for table while loading data
- Spinner for chat responses
- Progress bar for file uploads

**Empty States**:
- Friendly illustrations for empty table ("No data yet, upload your framework!")
- Empty chat: Suggested starter questions
- Clear call-to-action buttons

## Accessibility Considerations
- High contrast ratios (WCAG AA minimum)
- Focus indicators on all interactive elements
- Keyboard navigation for table (arrow keys) and chat (tab)
- ARIA labels for icon-only buttons
- Screen reader announcements for chat responses
- Resizable chat panel for user preference

## Images
No hero images required for this utility application. Focus on:
- Icon library: Heroicons for UI elements (upload, chat, sort, filter icons)
- Placeholder graphics for empty states (illustration style, simple line art)
- Avatar placeholders for chat interface (user vs AI)