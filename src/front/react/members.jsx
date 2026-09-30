import React from 'react';
import { parseDate } from '@internationalized/date';
import { createRoot } from 'react-dom/client';
import { Alert, Avatar, AvatarGroup, Calendar, DateField, DatePicker, Label } from '@heroui/react';

const COLORS = ['accent', 'success', 'warning', 'danger'];

const initials = (name) =>
    String(name || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');

const Members = ({ owner, users }) => {
    if (!owner && !users.length) {
        return <span className="members-none">No members yet</span>;
    }
    return (
        <AvatarGroup max={5} size="lg">
            {owner && (
                <Avatar key={owner.id} title={`${owner.name} (${owner.email}) - Owner`}>
                    <Avatar.Fallback color="accent">{initials(owner.name)}</Avatar.Fallback>
                </Avatar>
            )}
            {users.map((user, i) => (
                <Avatar key={user.id} title={`${user.name} (${user.email})`}>
                    <Avatar.Fallback color={COLORS[(i + 1) % COLORS.length]}>{initials(user.name)}</Avatar.Fallback>
                </Avatar>
            ))}
        </AvatarGroup>
    );
};

let root = null;

// Called by dashboard.js each time the member list changes.
window.projectMembers = {
    render(element, owner, users) {
        if (!root) root = createRoot(element);
        root.render(<Members owner={owner} users={users} />);
    },
};

const InviteAlerts = ({ invites, onOpen, onDismiss }) => (
    <>
        {invites.map((invite) => (
            <Alert key={invite.id} status="accent">
                <Alert.Indicator />
                <Alert.Content>
                    <Alert.Title>You&apos;ve been invited to a project</Alert.Title>
                    <Alert.Description>
                        You can now access &quot;{invite.name}&quot;.
                    </Alert.Description>
                    <div className="invite-alert-actions">
                        <button type="button" className="invite-alert-btn" onClick={() => onOpen(invite)}>Open</button>
                        <button type="button" className="invite-alert-btn" onClick={() => onDismiss(invite)}>Dismiss</button>
                    </div>
                </Alert.Content>
            </Alert>
        ))}
    </>
);

let alertsRoot = null;
let pendingInvites = [];

// Called by dashboard.js when new projects shared with the current user show up.
window.inviteAlerts = {
    add(element, invites, onOpen) {
        if (!alertsRoot) alertsRoot = createRoot(element);
        const known = new Set(pendingInvites.map((i) => i.id));
        pendingInvites = [...pendingInvites, ...invites.filter((i) => !known.has(i.id))];

        const draw = () => alertsRoot.render(
            <InviteAlerts
                invites={pendingInvites}
                onOpen={(invite) => {
                    pendingInvites = pendingInvites.filter((i) => i.id !== invite.id);
                    draw();
                    onOpen(invite);
                }}
                onDismiss={(invite) => {
                    pendingInvites = pendingInvites.filter((i) => i.id !== invite.id);
                    draw();
                }}
            />,
        );
        draw();
    },
};

const taskRoots = new WeakMap();

// Small avatar stack shown on each task card.
window.taskAssignees = {
    render(element, users) {
        let taskRoot = taskRoots.get(element);
        if (!taskRoot) {
            taskRoot = createRoot(element);
            taskRoots.set(element, taskRoot);
        }
        taskRoot.render(
            <AvatarGroup max={3} size="sm">
                {users.map((user, i) => (
                    <Avatar key={user.id} title={`${user.name} (${user.email})`}>
                        <Avatar.Fallback color={COLORS[i % COLORS.length]}>{initials(user.name)}</Avatar.Fallback>
                    </Avatar>
                ))}
            </AvatarGroup>,
        );
    },
};

const DeadlinePicker = ({ value, onChange }) => (
    <DatePicker
        className="w-full"
        name="deadline"
        value={value ? parseDate(value) : null}
        onChange={(date) => onChange(date ? date.toString() : null)}
    >
        <Label>Deadline</Label>
        <DateField.Group fullWidth>
            <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
            <DateField.Suffix>
                <DatePicker.Trigger>
                    <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
            </DateField.Suffix>
        </DateField.Group>
        <DatePicker.Popover>
            <Calendar aria-label="Deadline">
                <Calendar.Header>
                    <Calendar.YearPickerTrigger>
                        <Calendar.YearPickerTriggerHeading />
                        <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                    <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                </Calendar.Grid>
                <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                        {({ year }) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                </Calendar.YearPickerGrid>
            </Calendar>
        </DatePicker.Popover>
    </DatePicker>
);

let deadlineRoot = null;
let deadlineElement = null;
let deadlineValue = null;

const drawDeadline = () => deadlineRoot.render(
    <DeadlinePicker
        value={deadlineValue}
        onChange={(next) => {
            deadlineValue = next;
            drawDeadline();
        }}
    />,
);

// Deadline field of the task modal: dashboard.js reads and writes it as 'YYYY-MM-DD' or null.
window.deadlinePicker = {
    mount(element) {
        deadlineElement = element;
        deadlineRoot = createRoot(element);
        drawDeadline();
    },
    set(value) {
        deadlineValue = value || null;
        if (deadlineRoot) drawDeadline();
    },
    get() {
        return deadlineValue;
    },
};
