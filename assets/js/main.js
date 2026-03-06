document.addEventListener('DOMContentLoaded', () => {

    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    mobileBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    });

    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('shadow-lg', 'shadow-black/20');
        } else {
            navbar.classList.remove('shadow-lg', 'shadow-black/20');
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.project-card, .tutorial-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.07}s`;
        card.style.opacity = '0';
        observer.observe(card);
    });

    const subscribeForm = document.getElementById('subscribeForm');
    subscribeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('subscribeEmail').value;
        const success = document.getElementById('subscribeSuccess');
        //TODO: integrate Mailchimp
        console.log('Subscribe:', email);
        success.classList.remove('hidden');
        this.querySelector('button').textContent = 'Subscribed!';
        this.querySelector('button').disabled = true;
        this.querySelector('button').classList.add('opacity-60', 'cursor-not-allowed');
    });

    // Tag filtering
    const filterBtns = document.querySelectorAll('.tag-filter-btn');
    const projectCards = document.querySelectorAll('#projectGrid .project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;

            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter cards
            projectCards.forEach(card => {
                if (tag === 'all') {
                    card.classList.remove('tag-hidden');
                } else {
                    const cardTags = (card.dataset.tags || '').split(',');
                    if (cardTags.includes(tag)) {
                        card.classList.remove('tag-hidden');
                    } else {
                        card.classList.add('tag-hidden');
                    }
                }
            });
        });
    });

});
