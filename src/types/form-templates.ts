// Base option template with required id
export const baseOptionTemplate = {
  id: `temp_${Date.now()}`, // Geçici benzersiz ID
  text: '',
  toBeDeleted: false
};

// Base question template with required id
export const baseQuestionTemplate = {
  id: -Date.now(), // Geçici negatif ID
  text: '',
  imageUrl: '',
  options: [
    { ...baseOptionTemplate },
    { ...baseOptionTemplate }
  ],
  correctOptionIdOrIndex: -1,
  toBeDeleted: false
};

// Base form template
export const baseFormTemplate = {
  title: '',
  slug: '',
  description: '',
  category: '',
  passingScore: 70,
  timeLimit: 60,
  randomizeQuestions: false,
  randomizeOptions: false,
  isPublished: false,
  isPublicViewable: false,
  questions: []
};

// Helper function to create new option with unique temp ID
export function createNewOption(): typeof baseOptionTemplate {
  return {
    ...baseOptionTemplate,
    id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Daha benzersiz ID
  };
}

// Helper function to create new question with unique temp ID
export function createNewQuestion(): typeof baseQuestionTemplate {
  return {
    ...baseQuestionTemplate,
    id: -Date.now(), // Geçici negatif ID
    options: [createNewOption(), createNewOption()]
  };
}

// Type guard functions
export function isValidOption(option: unknown): option is typeof baseOptionTemplate {
  return option !== null && 
         typeof option === 'object' && 
         'id' in option &&
         'text' in option && 
         'toBeDeleted' in option;
}

export function isValidQuestion(question: unknown): question is typeof baseQuestionTemplate {
  return question !== null && 
         typeof question === 'object' && 
         'id' in question &&
         'text' in question && 
         'options' in question && 
         Array.isArray((question as any).options) &&
         'correctOptionIdOrIndex' in question && 
         'toBeDeleted' in question;
} 