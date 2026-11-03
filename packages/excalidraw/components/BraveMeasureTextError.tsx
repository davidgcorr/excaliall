import Trans from "./Trans";

const BraveMeasureTextError = () => {
  return (
    <div data-testid="brave-measure-text-error">
      <p>
        <Trans
          i18nKey="errors.brave_measure_text_error.line1"
          bold={(el) => <span style={{ fontWeight: 600 }}>{el}</span>}
        />
      </p>
      <p>
        <Trans
          i18nKey="errors.brave_measure_text_error.line2"
          bold={(el) => <span style={{ fontWeight: 600 }}>{el}</span>}
        />
      </p>
      <p>
        <Trans
          i18nKey="errors.brave_measure_text_error.line3"
          link={(el) => (
            <a href="https://github.com/davidgcorr/excalidraw#readme">{el}</a>
          )}
        />
      </p>
      <p>
        <Trans
          i18nKey="errors.brave_measure_text_error.line4"
          issueLink={(el) => (
            <a href="https://github.com/davidgcorr/excalidraw/issues/new">
              {el}
            </a>
          )}
          discordLink={(el) => (
            <a href="https://github.com/davidgcorr/excalidraw/issues">{el}.</a>
          )}
        />
      </p>
    </div>
  );
};

export default BraveMeasureTextError;
