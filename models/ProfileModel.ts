import {Event} from "./EventModel";

enum Role {
    Admin,
    Deputy,
    Helper
}

export interface Profile {
    id: string;
    email: string;
    job_title: string;
    full_name: string;
    roles: Role[];
    user_roles: Role[];
    documents: Document[];
    events: Event[];
    events_organized: Event[];
    tasks: [];
    deputy?: String;
}

export interface ProfileScreenDto {
    id: string;
    email: string;
    job_title: string;
    full_name: string;
    roles: Role[];
    author_event_count: number;
    event_count: number;
    task_count: number;
}
