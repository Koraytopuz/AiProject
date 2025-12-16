export type QuestionCategory =
  | 'gecmis_iliski'
  | 'son_aktiviteler'
  | 'duygusal_tepkiler'
  | 'acik_uclu';

export interface QuestionTemplate {
  number: number;
  text: string;
  category: QuestionCategory;
}

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    number: 1,
    text: 'Son 1 haftada partnerinle en çok tartıştığın konu neydi?',
    category: 'duygusal_tepkiler',
  },
  {
    number: 2,
    text: 'Bugün gün içinde neler yaptın? En baştan anlatır mısın?',
    category: 'son_aktiviteler',
  },
  {
    number: 3,
    text: 'Eski ilişkilerinden birinde yaptığın en büyük hata sence neydi?',
    category: 'gecmis_iliski',
  },
  {
    number: 4,
    text: 'Partnerin seni en son ne zaman hayal kırıklığına uğrattı?',
    category: 'duygusal_tepkiler',
  },
  {
    number: 5,
    text: 'Bugün kimlerle konuştun veya mesajlaştın, hatırladığın kadarıyla anlatır mısın?',
    category: 'son_aktiviteler',
  },
  {
    number: 6,
    text: 'İlişkide seni en çok ne kıskandırır?',
    category: 'duygusal_tepkiler',
  },
  {
    number: 7,
    text: 'Eski partnerlerinle şu an herhangi bir iletişimin var mı?',
    category: 'gecmis_iliski',
  },
  {
    number: 8,
    text: 'Bugün gün içinde kaç kez telefon ekranına baktığını tahmin edebilir misin?',
    category: 'son_aktiviteler',
  },
  {
    number: 9,
    text: 'Partnerine en son ne zaman yalan söyledin? Ne hakkında olduğunu paylaşmak ister misin?',
    category: 'acik_uclu',
  },
  {
    number: 10,
    text: 'İlişkinde en çok hangi durumda huzursuz hissediyorsun?',
    category: 'duygusal_tepkiler',
  },
  {
    number: 11,
    text: 'Eski ilişkilerinden birinde sana yapılan, hâlâ aklına gelen bir davranış var mı?',
    category: 'gecmis_iliski',
  },
  {
    number: 12,
    text: 'Bugün partnerin dışında en çok kiminle iletişim kurdun?',
    category: 'son_aktiviteler',
  },
  {
    number: 13,
    text: 'Partnerinle geleceğe dair konuşurken en çok hangi konuda geriliyorsun?',
    category: 'duygusal_tepkiler',
  },
  {
    number: 14,
    text: 'Sosyal medyada partnerinden gizlediğin bir hesap, kişi veya davranış var mı?',
    category: 'acik_uclu',
  },
  {
    number: 15,
    text: 'Son 24 saatte seni en çok mutlu eden şey neydi?',
    category: 'acik_uclu',
  },
  {
    number: 16,
    text: 'Eski partnerlerinden biri şu an seni arasaydı ne hissederdin?',
    category: 'gecmis_iliski',
  },
  {
    number: 17,
    text: 'Bugün partnerini kaç kez düşündüğünü tahmin ediyorsun?',
    category: 'duygusal_tepkiler',
  },
  {
    number: 18,
    text: 'Partnerinle yaşadığın ama çözülmemiş olduğunu düşündüğün bir konu var mı?',
    category: 'acik_uclu',
  },
  {
    number: 19,
    text: 'Gün içinde partnerine söylemeyip sadece kendine sakladığın bir düşünce oldu mu?',
    category: 'acik_uclu',
  },
  {
    number: 20,
    text: 'İlişkinle ilgili şu an en çok neyi merak ediyor veya sorguluyorsun?',
    category: 'acik_uclu',
  },
];


