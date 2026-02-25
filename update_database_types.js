const fs = require('fs');

const path = './lib/database.types.ts';
let content = fs.readFileSync(path, 'utf-8');

const foldersType = `
            folders: {
                Row: {
                    created_at: string
                    id: string
                    name: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    name: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    name?: string
                    user_id?: string
                }
                Relationships: []
            }
`;

const notesType = `
            notes: {
                Row: {
                    content: string | null
                    created_at: string
                    folder_id: string | null
                    id: string
                    title: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    content?: string | null
                    created_at?: string
                    folder_id?: string | null
                    id?: string
                    title: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    content?: string | null
                    created_at?: string
                    folder_id?: string | null
                    id?: string
                    title?: string
                    updated_at?: string
                    user_id?: string
                }
                Relationships: []
            }
`;

if (!content.includes('folders: {')) {
    content = content.replace('Tables: {', 'Tables: {' + foldersType + notesType);
    fs.writeFileSync(path, content, 'utf-8');
    console.log('Types updated.');
} else {
    console.log('Types already exist.');
}
