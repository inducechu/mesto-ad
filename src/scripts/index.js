/*
  Файл index.js является точкой входа в наше приложение
  и только он должен содержать логику инициализации нашего приложения
  используя при этом импорты из других файлов

  Из index.js не допускается что то экспортировать
*/

import { createCardElement, deleteCard, likeCard } from "./components/card.js";
import { openModalWindow, closeModalWindow, setCloseModalWindowEventListeners } from "./components/modal.js";
import { enableValidation, clearValidation } from "./components/validation.js";
import { getUserInfo, getCardList, setUserInfo, setAvatar, addCard, removeCardServer, changeLikeCardStatus } from "./components/api.js";

const validationSettings = {
  formSelector: ".popup__form",
  inputSelector: ".popup__input",
  submitButtonSelector: ".popup__button",
  inactiveButtonClass: "popup__button_disabled",
  inputErrorClass: "popup__input_type_error",
  errorClass: "popup__error_visible",
};

let currentUserId = "";

const placesWrap = document.querySelector(".places__list");
const logoButton = document.querySelector(".header__logo");

const profileFormModalWindow = document.querySelector(".popup_type_edit");
const profileForm = profileFormModalWindow.querySelector(".popup__form");
const profileTitleInput = profileForm.querySelector(".popup__input_type_name");
const profileDescriptionInput = profileForm.querySelector(".popup__input_type_description");

const cardFormModalWindow = document.querySelector(".popup_type_new-card");
const cardForm = cardFormModalWindow.querySelector(".popup__form");
const cardNameInput = cardForm.querySelector(".popup__input_type_card-name");
const cardLinkInput = cardForm.querySelector(".popup__input_type_url");

const imageModalWindow = document.querySelector(".popup_type_image");
const imageElement = imageModalWindow.querySelector(".popup__image");
const imageCaption = imageModalWindow.querySelector(".popup__caption");

const openProfileFormButton = document.querySelector(".profile__edit-button");
const openCardFormButton = document.querySelector(".profile__add-button");

const profileTitle = document.querySelector(".profile__title");
const profileDescription = document.querySelector(".profile__description");
const profileAvatar = document.querySelector(".profile__image");

const avatarFormModalWindow = document.querySelector(".popup_type_edit-avatar");
const avatarForm = avatarFormModalWindow.querySelector(".popup__form");
const avatarInput = avatarForm.querySelector(".popup__input");

const statsModalWindow = document.querySelector(".popup_type_info");
const statsContainer = statsModalWindow.querySelector(".popup__stats-container");
const definitionTemplate = document.getElementById("popup-info-definition-template");
const userPreviewTemplate = document.getElementById("popup-info-user-preview-template");

const formatDate = (date) =>
  date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const createInfoString = (title, value) => {
  const templateClone = definitionTemplate.content.cloneNode(true);
  templateClone.querySelector(".popup__info-title").textContent = title;
  templateClone.querySelector(".popup__info-value").textContent = value;
  return templateClone;
};

const createUserBadge = (name) => {
  const templateClone = userPreviewTemplate.content.cloneNode(true);
  templateClone.querySelector(".popup__info-user-badge").textContent = name;
  return templateClone;
};

const renderLoading = (isLoading, buttonElement, defaultText = "Сохранить") => {
  if (isLoading) {
    buttonElement.textContent = "Сохранение...";
  } else {
    buttonElement.textContent = defaultText;
  }
};

const handlePreviewPicture = ({ name, link }) => {
  imageElement.src = link;
  imageElement.alt = name;
  imageCaption.textContent = name;
  openModalWindow(imageModalWindow);
};

const handleLikeIcon = (likeButton, likeCount, cardId) => {
  const isLiked = likeButton.classList.contains("card__like-button_is-active");
  changeLikeCardStatus(cardId, isLiked)
    .then((updatedCardData) => {
      likeCard(likeButton, likeCount, updatedCardData);
    })
    .catch((err) => {
      console.log(err);
    });
};

const handleDeleteCard = (cardElement, cardId) => {
  removeCardServer(cardId)
    .then(() => {
      deleteCard(cardElement);
    })
    .catch((err) => {
      console.log(err);
    });
};

const handleLogoClick = () => {
  getCardList()
    .then((cards) => {
      statsContainer.innerHTML = "";

      if (!cards || cards.length === 0) {
        statsContainer.append(createInfoString("Всего карточек:", "0"));
        openModalWindow(statsModalWindow);
        return;
      }

      const totalCards = cards.length;

      const sortedCards = [...cards].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const firstCreated = formatDate(new Date(sortedCards[0].createdAt));
      const lastCreated = formatDate(new Date(sortedCards[sortedCards.length - 1].createdAt));

      const userCardsCountMap = {};
      const userNamesMap = {};

      cards.forEach((card) => {
        const ownerId = card.owner._id;
        userCardsCountMap[ownerId] = (userCardsCountMap[ownerId] || 0) + 1;
        userNamesMap[ownerId] = card.owner.name;
      });

      const totalUsers = Object.keys(userCardsCountMap).length;
      const maxCardsFromOne = Math.max(...Object.values(userCardsCountMap));

      statsContainer.append(createInfoString("Всего карточек:", String(totalCards)));
      statsContainer.append(createInfoString("Первая создана:", firstCreated));
      statsContainer.append(createInfoString("Последняя создана:", lastCreated));
      statsContainer.append(createInfoString("Всего пользователей:", String(totalUsers)));
      statsContainer.append(createInfoString("Максимум карточек от одного:", String(maxCardsFromOne)));

      const subtitleElement = document.createElement("h4");
      subtitleElement.className = "popup__info-subtitle";
      subtitleElement.style.cssText = "margin: 15px 0 10px; font-size: 14px; color: #000;";
      subtitleElement.textContent = "Все пользователи:";
      statsContainer.append(subtitleElement);

      const usersListWrapper = document.createElement("div");
      usersListWrapper.className = "popup__info-users-list";
      usersListWrapper.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px;";

      Object.values(userNamesMap).forEach((name) => {
        usersListWrapper.append(createUserBadge(name));
      });

      statsContainer.append(usersListWrapper);

      openModalWindow(statsModalWindow);
    })
    .catch((err) => {
      console.log("Ошибка загрузки статистики:", err);
    });
};

const handleProfileFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = evt.submitter;
  renderLoading(true, submitButton);

  setUserInfo({
    name: profileTitleInput.value,
    about: profileDescriptionInput.value,
  })
    .then((userData) => {
      profileTitle.textContent = userData.name;
      profileDescription.textContent = userData.about;
      closeModalWindow(profileFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(false, submitButton);
    });
};

const handleAvatarFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = evt.submitter;
  renderLoading(true, submitButton);

  setAvatar({
    avatar: avatarInput.value,
  })
    .then((userData) => {
      profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
      closeModalWindow(avatarFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(false, submitButton);
    });
};

const handleCardFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = evt.submitter;
  renderLoading(true, submitButton, "Создать");

  addCard({
    name: cardNameInput.value,
    link: cardLinkInput.value,
  })
    .then((cardData) => {
      placesWrap.prepend(
        createCardElement(cardData, currentUserId, {
          onPreviewPicture: handlePreviewPicture,
          onLikeIcon: handleLikeIcon,
          onDeleteCard: handleDeleteCard,
        })
      );
      closeModalWindow(cardFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(false, submitButton, "Создать");
    });
};

profileForm.addEventListener("submit", handleProfileFormSubmit);
cardForm.addEventListener("submit", handleCardFormSubmit);
avatarForm.addEventListener("submit", handleAvatarFormSubmit);

logoButton.addEventListener("click", handleLogoClick);

openProfileFormButton.addEventListener("click", () => {
  profileTitleInput.value = profileTitle.textContent;
  profileDescriptionInput.value = profileDescription.textContent;
  
  clearValidation(profileForm, validationSettings);
  
  const buttonElement = profileForm.querySelector(validationSettings.submitButtonSelector);
  if (profileTitleInput.value && profileDescriptionInput.value) {
    buttonElement.classList.remove(validationSettings.inactiveButtonClass);
    buttonElement.disabled = false;
  }
  
  openModalWindow(profileFormModalWindow);
});

profileAvatar.addEventListener("click", () => {
  avatarForm.reset();
  clearValidation(avatarForm, validationSettings);
  openModalWindow(avatarFormModalWindow);
});

openCardFormButton.addEventListener("click", () => {
  cardForm.reset();
  clearValidation(cardForm, validationSettings);
  openModalWindow(cardFormModalWindow);
});

//настраиваем обработчики закрытия попапов
const allPopups = document.querySelectorAll(".popup");
allPopups.forEach((popup) => {
  setCloseModalWindowEventListeners(popup);
});

enableValidation(validationSettings);

Promise.all([getUserInfo(), getCardList()])
  .then(([userData, cardsData]) => {
    currentUserId = userData._id;
    
    profileTitle.textContent = userData.name;
    profileDescription.textContent = userData.about;
    profileAvatar.style.backgroundImage = `url(${userData.avatar})`;

    cardsData.forEach((cardData) => {
      placesWrap.append(
        createCardElement(cardData, currentUserId, {
          onPreviewPicture: handlePreviewPicture,
          onLikeIcon: handleLikeIcon,
          onDeleteCard: handleDeleteCard,
        })
      );
    });
  })
  .catch((err) => {
    console.log(err);
  });
