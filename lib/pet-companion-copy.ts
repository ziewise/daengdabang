import type { PetGuidePrompt } from "./pet-companion-guide";

const names: Record<string, string> = {
    몽이: "Mongi", 뭉이: "Moongi", 보리: "Bori", 두부: "Dubu", 초코: "Choco",
    콩이: "Kongi", 구름이: "Gureumi", 구름: "Gureum", 별이: "Byeori", 뽀미: "Ppomi",
    쿠키: "Cookie", 코코: "Coco", 모찌: "Mochi", 루이: "Louis", 라떼: "Latte", 밤이: "Bami",
};
const onset = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const vowel = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const coda = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];

export function walkingBuddyName(name: string, locale: "en" | "ko"): string {
    if (locale !== "en" || !name) return name;
    if (names[name]) return names[name];
    return name.replace(/[가-힣]+/g, word => {
        const latin = Array.from(word, letter => {
            const index = letter.charCodeAt(0) - 0xac00;
            return onset[Math.floor(index / 588)] + vowel[Math.floor(index / 28) % 21] + coda[index % 28];
        }).join("");
        return latin[0].toUpperCase() + latin.slice(1);
    });
}

const guide: Record<PetGuidePrompt["id"], [string, string, string?]> = {
    color: ["Pick a color", "Tap a swatch and watch the photo change. Which one catches your eye?"],
    "try-on": ["Try it on your pup", "Let's see how it looks on your dog. You can adjust the fit in the photo.", "Try it on"],
    "product-actions": ["Make it yours", "Found a favorite? Pick your options and quantity here."],
    settings: ["Your walking buddy", "Tap the paw to pick my breed, coat color and walking pace.", "Open settings"],
    home: ["Take a little break", "Tap the doghouse to send me home. Tap again when you're ready for company!", "Head home"],
    chatbot: ["케어톡", "Got a question? Ask about daily life with your dog or something you spotted in the shop.", "Ask a question"],
    "pet-lens": ["Meet PetLens", "Tap PetLens and add a photo to explore breeds and find picks for your pup.", "Open PetLens"],
    "signup-provider": ["Join the pack", "Use Naver, Kakao or Google if available, or sign up with your email below."],
    "signup-account": ["A few details first", "Enter your name, email and phone number, then choose a password of at least 8 characters."],
    "signup-pet-photo": ["Pup, meet camera", "PetLens can suggest a breed, size, coat color and weight from a photo. Add your dog's age, sex and current weight yourself."],
    "signup-breed": ["Find your dog's look", "Pick a matching breed from the list or type your own for a mixed breed or one you don't see."],
    "signup-weight": ["A better fit", "Photos can only suggest a size. Enter your dog's current measured weight for harness and clothing recommendations."],
    "signup-submit": ["One last step", "Review the required terms and privacy agreement, then sign up to see your dog's profile and recommendations."],
    signup: ["Join the pack", "Open the sign-in menu to create an account and meet your dog's walking buddy.", "See how to join"],
};

export function walkingBuddyGuide(prompt: PetGuidePrompt, english: boolean) {
    if (!english) return prompt;
    let [name, message, actionLabel] = guide[prompt.id];
    if (prompt.id === "try-on" && prompt.href) {
        message = "Add a photo of your dog and we'll show you how it looks.";
        actionLabel = "Add a photo";
    } else if (prompt.id === "pet-lens" && prompt.message.includes("다시")) {
        message = "Try another photo in PetLens for a fresh look at picks for your dog.";
    } else if (prompt.id === "signup" && prompt.activatesTarget) {
        name = "Find sign-up"; actionLabel = "Open menu";
    }
    return { ...prompt, name, message, actionLabel: prompt.actionLabel ? actionLabel : undefined };
}

const words: Record<string, string> = {
    "보러 가기": "Take a look", "추천 닫기": "Close recommendation", "안내 닫기": "Close tip",
    "드래그해서 옮기고, 클릭하면 빠른 메뉴가 열려요": "Drag to move me. Tap for my menu.",
    "빠른 메뉴 닫기": "Close buddy menu", "집으로 보내기": "Send home", "설정하기": "Buddy settings",
    "산책 친구 설정": "Walking buddy settings", "설정 닫기": "Close settings", "활성 반려견": "Active dog",
    "친구 이름": "Buddy's name", "예: 몽이": "e.g. Mongi", "견종 캐릭터 검색": "Find a breed",
    "예: 닥스훈트, 비숑, 진돗개": "e.g. Dachshund, Bichon, Jindo", "견종 검색 결과": "Breed search results",
    "견종 캐릭터 선택": "Choose a breed", "털 색상": "Coat color", "산책 속도": "Walking pace",
    "차분하게": "Leisurely", "활발하게": "Lively", "상품 추천 말풍선": "Show shopping tips",
    "쇼핑몰에서 함께 산책": "Walk with me in the shop", "취소": "Cancel", "저장하고 산책하기": "Save and go for a walk",
    "회원가입하기": "Create an account", "계속 둘러보기": "Keep exploring", "크림": "Cream",
    "애프리콧": "Apricot", "캐러멜": "Caramel", "차콜": "Charcoal", "이 상품": "This pick",
    "이 기기에 저장했어요.": "Saved on this device.", "회원 반려견 설정으로 저장했어요.": "Saved to your dog's profile.",
    "지금은 이 기기에 안전하게 저장했어요.": "Your settings are saved on this device.",
    "회원가입 후 이용할 수 있어요": "Save your walking buddy", "산책 친구를 변경하고 저장하려면 회원가입이 필요해요. 가입 후 우리 아이 설정에서 언제든 다시 바꿀 수 있습니다.": "Create an account to save your walking buddy. You can change your choices in your dog's profile anytime.",
    "산책하실 때 눈여겨보시면 좋을 것 같아요.": "Here's a little something for our next walk!",
    "털 관리하실 때 함께 살펴보세요.": "Taking care of that lovely coat? Have a sniff around here.",
    "활동량이 많은 아이에게 잘 어울릴 것 같아요!": "Got a pup who loves to play? Take a peek at this!",
    "원료와 급여 기준부터 함께 확인해 보세요.": "Let's check the ingredients and feeding guide together.",
};

export function walkingBuddyCopy(text: string, english: boolean): string {
    if (!english) return text;
    if (text.includes("의 댕픽은 이 상품")) return "I sniffed out a pick for you. Shall we take a look?";
    return words[text] ?? text;
}
