/**
 * 마법공식 투자 - 한국 주식 스크리너
 * 메인 JavaScript 파일
 */

document.addEventListener('DOMContentLoaded', function() {
    // 모바일 메뉴 토글
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const headerNav = document.getElementById('headerNav');
    
    if (mobileMenuBtn && headerNav) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            headerNav.classList.toggle('active');
        });
        
        // 메뉴 외부 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !headerNav.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                headerNav.classList.remove('active');
            }
        });
    }
    
    // 스크리너 폼 제출 처리
    const screenerForm = document.getElementById('screenerForm');
    if (screenerForm) {
        screenerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 로그인 필요 알림
            alert('스크리너를 사용하려면 로그인이 필요합니다.\n회원가입 또는 로그인 후 이용해 주세요.');
            
            // 로그인 페이지로 이동 (원하는 경우 활성화)
            // window.location.href = 'login.html';
        });
    }
    
    // 시가총액 입력 유효성 검사
    const minMarketCapInput = document.getElementById('minMarketCap');
    if (minMarketCapInput) {
        minMarketCapInput.addEventListener('change', function() {
            let value = parseInt(this.value);
            
            if (isNaN(value) || value < 100) {
                this.value = 100;
            } else if (value > 10000) {
                this.value = 10000;
            }
        });
    }
    
    // 현재 페이지 네비게이션 활성화
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-list a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // 로그인/회원가입 폼은 js/auth-login.js, js/auth-register.js (Firebase)에서 처리
    
    // FAQ 토글 이벤트 위임
    const faqList = document.querySelector('.faq-list');
    if (faqList) {
        faqList.addEventListener('click', function(e) {
            const question = e.target.closest('.faq-question');
            if (question) {
                toggleFaq(question);
            }
        });
    }
});

/**
 * 이메일 유효성 검사
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 에러 메시지 표시
 */
function showError(message) {
    // 기존 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 에러 메시지 생성
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        background-color: #fee2e2;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 14px;
        border: 1px solid #fecaca;
    `;
    
    // 폼 상단에 삽입
    const form = document.querySelector('form');
    if (form) {
        form.insertBefore(errorDiv, form.firstChild);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

/**
 * 성공 메시지 표시
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        background-color: #d1fae5;
        color: #059669;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 14px;
        border: 1px solid #a7f3d0;
    `;
    
    const form = document.querySelector('form');
    if (form) {
        form.insertBefore(successDiv, form.firstChild);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
}

/**
 * FAQ 토글 함수
 */
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const answer = faqItem.querySelector('.faq-answer');
    const toggle = element.querySelector('.faq-toggle');
    
    if (answer.classList.contains('open')) {
        answer.classList.remove('open');
        toggle.textContent = '+';
    } else {
        // 다른 FAQ 닫기
        document.querySelectorAll('.faq-answer.open').forEach(function(openAnswer) {
            openAnswer.classList.remove('open');
            openAnswer.parentElement.querySelector('.faq-toggle').textContent = '+';
        });
        
        answer.classList.add('open');
        toggle.textContent = '−';
    }
}
