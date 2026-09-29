# 8. Team organization: task reassignment for members on internships (3 days/week)

## Status

Accepted

## Context

The project team consists of six members. Two team members took on internships three days a week in parallel with this project, leaving them only two working days a week.
This reduced their individual project availability by 60% and risked stalling progress whenever critical dependencies fell on their internship days.

## Decision

Reassign tasks and adjust the schedule according to the reduced weekly availability of both members:

- **Critical & operational paths**: Assign critical architecture tasks, urgent patches, and daily dependencies strictly to the four full-time project members.
- **Independent & modular scope**: Assign both members well-isolated, autonomous tasks (e.g., research, documentation, CI/CD, test suites, API integration) fitting a 2-day weekly capacity without blocking teammates during their 3 days of internship.
- **Handover protocol**: Require explicit status updates on active tickets before leaving for internships to ensure full-time members have complete context.
- **Rituals alignment**: Schedule planning and review syncs exclusively on days when the entire 6-person team is present.

## Consequences

- Full-time members can iterate continuously without waiting on part-time deliverables.
- Protects members on internships from context switching and pressure between the two commitments.
- Lower overall team throughput, requiring stricter backlog prioritization.
- Requires slicing tasks into smaller, 2-day-compatible deliverables for the two members.

## Alternatives Considered

- **Keep the same task distribution**: Rejected—blocked project progress for several days whenever an urgent task or PR review depended on someone away on internship.