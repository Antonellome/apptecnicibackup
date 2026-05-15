{ pkgs, ... }: {
  # Aggiornato il canale a una versione che supporta nativamente Node.js 22
  channel = "stable-24.11";

  # Pacchetti da installare nell'ambiente
  packages = [
    pkgs.nodejs_22
  ];

  # Configurazione specifica di IDX
  idx = {
    # Estensioni VS Code
    extensions = [
      "vite.vscode-vite"
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];

    # Configurazione del workspace
    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
    };

    # Configurazione dell'anteprima (Preview) per il server di sviluppo
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0" ];
          manager = "web";
        };
      };
    };
  };
}