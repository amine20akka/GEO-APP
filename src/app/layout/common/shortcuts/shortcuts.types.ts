export interface Shortcut {
    id: string;
    label: string;
    description?: string;
    icon: string;
    imgUrl?: string;
    link: string;
    useRouter: boolean;
    type: 'mapRelated' | 'other';  

}
